from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import AppUserPublicSerializer
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import require_rbac_method
from rest_framework import serializers


class StaffAppUserSerializer(AppUserPublicSerializer):
    listing_count = serializers.IntegerField(read_only=True, required=False)
    nagrita_uri = serializers.SerializerMethodField()
    nagrita_back_uri = serializers.SerializerMethodField()
    nation_card_uri = serializers.SerializerMethodField()
    other_document_uri = serializers.SerializerMethodField()
    avatar_uri = serializers.SerializerMethodField()

    class Meta(AppUserPublicSerializer.Meta):
        fields = (
            *AppUserPublicSerializer.Meta.fields,
            "listing_count",
            "is_active",
            "account_status",
            "nagrita_uri",
            "nagrita_back_uri",
            "nation_card_uri",
            "other_document_uri",
            "avatar_uri",
        )
        read_only_fields = fields

    def _staff_file(self, app, kind: str):
        request = self.context.get("request")
        if not request or not app:
            return None
        field = getattr(app, kind, None)
        if not field:
            return None
        return request.build_absolute_uri(f"/api/admin/verification/applications/{app.id}/file/{kind}/")

    def get_nagrita_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "nagrita")

    def get_nagrita_back_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "nagrita_back")

    def get_nation_card_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "nation_card")

    def get_other_document_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "other_document")

    def get_avatar_uri(self, obj: AppUser):
        request = self.context.get("request")
        if not request or not obj.avatar:
            return None
        try:
            return request.build_absolute_uri(obj.avatar.url)
        except Exception:
            return None


def parse_active(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "yes", "active"}


def revoke_app_tokens(user):
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

        OutstandingToken.objects.filter(user_id=user.id).delete()
    except Exception:
        pass


def filter_staff_users(qs, request):
    q = (request.query_params.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(full_name__icontains=q)
            | Q(email__icontains=q)
            | Q(phone__icontains=q)
            | Q(username__icontains=q)
        )

    role = (request.query_params.get("role") or "").strip().lower()
    if role in {"buyer", "user"}:
        qs = qs.filter(account_type=AppUser.ACCOUNT_USER)
    elif role in {"provider", "seller"}:
        qs = qs.filter(account_type=AppUser.ACCOUNT_PROVIDER)

    status_filter = (request.query_params.get("status") or "").strip().lower()
    if status_filter == "blocked":
        qs = qs.filter(account_status=AppUser.STATUS_BLOCKED)
    elif status_filter == "deactivated":
        qs = qs.filter(account_status=AppUser.STATUS_DEACTIVATED)
    elif status_filter == "pending":
        from apps.verification.models import ProviderApplication

        qs = qs.filter(provider_application__status=ProviderApplication.STATUS_PENDING)
    elif status_filter == "verified":
        from apps.verification.models import ProviderApplication

        qs = qs.filter(provider_application__status=ProviderApplication.STATUS_VERIFIED)
    elif status_filter == "active":
        from apps.verification.models import ProviderApplication

        qs = qs.filter(is_active=True, account_status=AppUser.STATUS_ACTIVE).exclude(
            provider_application__status=ProviderApplication.STATUS_PENDING
        )

    return qs


class StaffAppUserListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        require_rbac_method(request.user, "user_management", "GET")
        items = (
            AppUser.objects.select_related("provider_application")
            .annotate(listing_count=Count("listings", distinct=True))
            .order_by("-date_joined")
        )
        items = filter_staff_users(items, request)
        from apps.listings.listing_cards import paginate_queryset, parse_page

        page, page_size = parse_page(request, default_size=25, max_size=100)
        page_items, meta = paginate_queryset(items, page, page_size)
        return Response(
            {
                "results": StaffAppUserSerializer(page_items, many=True, context={"request": request}).data,
                **meta,
            }
        )


class StaffAppUserDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        require_rbac_method(request.user, "user_management", "PATCH")
        from django.utils import timezone

        user = get_object_or_404(AppUser, pk=pk)
        status_value = str(request.data.get("status") or "").strip().lower()
        update_fields: list[str] = []

        if "is_active" in request.data:
            user.is_active = parse_active(request.data.get("is_active"))
            user.account_status = AppUser.STATUS_ACTIVE if user.is_active else AppUser.STATUS_BLOCKED
            update_fields.extend(["is_active", "account_status"])
        if status_value in {"blocked"}:
            user.is_active = False
            user.account_status = AppUser.STATUS_BLOCKED
            update_fields.extend(["is_active", "account_status"])
        elif status_value in {"deactivated", "inactive"}:
            user.is_active = False
            user.account_status = AppUser.STATUS_DEACTIVATED
            update_fields.extend(["is_active", "account_status"])
        elif status_value in {"active"}:
            user.is_active = True
            user.account_status = AppUser.STATUS_ACTIVE
            update_fields.extend(["is_active", "account_status"])

        note = request.data.get("staff_warning", request.data.get("notes", None))
        if note is not None:
            text = str(note).strip()
            user.staff_warning = text
            user.staff_warning_at = timezone.now() if text else None
            update_fields.extend(["staff_warning", "staff_warning_at"])

        if update_fields:
            user.save(update_fields=list(dict.fromkeys(update_fields)))
        if not user.is_active and status_value in {"blocked", "deactivated", "inactive"}:
            revoke_app_tokens(user)
        elif "is_active" in request.data and not user.is_active:
            revoke_app_tokens(user)

        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        return Response(StaffAppUserSerializer(user, context={"request": request}).data)

    def delete(self, request, pk):
        require_rbac_method(request.user, "user_management", "DELETE")
        user = get_object_or_404(AppUser, pk=pk)
        revoke_app_tokens(user)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
