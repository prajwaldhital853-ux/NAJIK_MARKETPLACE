from django.db.models import Sum
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.models.referral import (
    ReferEarnConfig,
    Referral,
    ensure_fresh_invite_code,
    generate_referral_code,
    referral_status_detail,
)
from apps.accounts.permissions import IsAppUser
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


def public_refer_config_payload():
    cfg = ReferEarnConfig.get_solo()
    return {
        "is_active": cfg.is_active,
        "reward_amount": cfg.reward_amount,
        "reward_label": cfg.reward_label,
        "description": cfg.description,
    }


def referral_row_payload(row: Referral) -> dict:
    referred = row.referred
    return {
        "id": str(row.id),
        "name": referred.full_name or referred.phone or "User",
        "status": row.status,
        "status_label": "Earned" if row.status == Referral.STATUS_EARNED else "Joined",
        "status_detail": referral_status_detail(row),
        "reward_amount": row.reward_amount,
        "reward_label": f"Rs. {row.reward_amount}",
        "joined_at": row.joined_at,
        "earned_at": row.earned_at,
    }


def refer_how_it_works(cfg: ReferEarnConfig) -> list[dict]:
    reward = cfg.reward_label
    return [
        {
            "step": 1,
            "title": "Share your one-time code",
            "body": "Each code works for one friend only. After someone joins, you get a new code automatically.",
        },
        {
            "step": 2,
            "title": "Friend registers as seller",
            "body": "They must enter your code when signing up as a service provider on NAJIK.",
        },
        {
            "step": 3,
            "title": "Friend gets verified",
            "body": "NAJIK admin must approve their nagrita and profile before the reward can count.",
        },
        {
            "step": 4,
            "title": "Friend publishes first live listing",
            "body": f"They must publish one live listing (not draft). Then you receive {reward} in Payments.",
        },
    ]


class PublicReferEarnConfigView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(public_refer_config_payload())


class ReferEarnMeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        user = request.user
        if user.account_type != AppUser.ACCOUNT_PROVIDER:
            return Response({"detail": "Refer & Earn is for service providers."}, status=status.HTTP_403_FORBIDDEN)
        from apps.accounts.models.referral import _referrer_is_eligible, ensure_fresh_invite_code, sync_joined_referral_earnings

        if not _referrer_is_eligible(user):
            return Response(
                {"detail": "Complete verification to unlock your invite code and earn rewards."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = AppUser.objects.get(pk=user.pk)
        sync_joined_referral_earnings(user)
        code = ensure_fresh_invite_code(user)
        cfg = ReferEarnConfig.get_solo()
        rows = list(Referral.objects.filter(referrer=user).select_related("referred").order_by("-joined_at")[:50])
        earned_total = (
            Referral.objects.filter(referrer=user, status=Referral.STATUS_EARNED).aggregate(total=Sum("reward_amount"))[
                "total"
            ]
            or 0
        )
        all_sent = Referral.objects.filter(referrer=user).count()
        joined_count = all_sent
        earned_count = Referral.objects.filter(referrer=user, status=Referral.STATUS_EARNED).count()
        return Response(
            {
                "invite_code": code,
                "is_active": cfg.is_active,
                "reward_amount": cfg.reward_amount,
                "reward_label": cfg.reward_label,
                "description": cfg.description,
                "how_it_works": refer_how_it_works(cfg),
                "stats": {
                    "invites_sent": all_sent,
                    "joined": joined_count,
                    "earned_count": earned_count,
                    "earned_total": earned_total,
                    "earned_total_label": f"Rs. {earned_total}",
                },
                "recent": [referral_row_payload(row) for row in rows],
            }
        )


class StaffReferEarnConfigView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(public_refer_config_payload())

    def patch(self, request):
        cfg = ReferEarnConfig.get_solo()
        if "reward_amount" in request.data:
            try:
                cfg.reward_amount = max(0, int(request.data.get("reward_amount")))
            except (TypeError, ValueError):
                return Response({"detail": "Invalid reward_amount."}, status=status.HTTP_400_BAD_REQUEST)
        if "reward_label" in request.data:
            cfg.reward_label = (request.data.get("reward_label") or cfg.reward_label).strip()[:40]
        if "description" in request.data:
            cfg.description = (request.data.get("description") or "").strip()
        if "is_active" in request.data:
            cfg.is_active = bool(request.data.get("is_active"))
        cfg.save()
        return Response(public_refer_config_payload())


class StaffReferralListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = Referral.objects.select_related("referrer", "referred").order_by("-joined_at")[:300]
        status_filter = (request.query_params.get("status") or "").strip()
        if status_filter in {Referral.STATUS_JOINED, Referral.STATUS_EARNED}:
            items = items.filter(status=status_filter)
        return Response(
            [
                {
                    "id": str(row.id),
                    "invite_code": row.invite_code,
                    "status": row.status,
                    "reward_amount": row.reward_amount,
                    "joined_at": row.joined_at,
                    "earned_at": row.earned_at,
                    "referrer_id": str(row.referrer_id),
                    "referrer_name": row.referrer.full_name or "",
                    "referred_id": str(row.referred_id),
                    "referred_name": row.referred.full_name or "",
                    "referred_phone": row.referred_phone,
                    "referred_email": row.referred_email,
                }
                for row in items
            ]
        )
