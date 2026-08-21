from django.db import connection
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import AppUser
from apps.listings.models import Listing
from apps.reports.models import Complaint
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.verification.models import ProviderApplication, ProviderIdCard


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        return Response({"status": "ok", "service": "najik-api"})


def _check(label: str, status: str, detail: str, href: str = ""):
    """status: ok | attention | problem"""
    return {
        "id": label.lower().replace(" ", "_").replace("/", "_"),
        "label": label,
        "ok": status == "ok",
        "status": status,
        "detail": detail,
        "href": href,
    }


class StaffSystemStatusView(APIView):
    """Live operational snapshot for the admin sidebar."""

    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        checks = []
        now = timezone.now().isoformat()

        db_ok = True
        db_detail = "Database connected"
        try:
            connection.ensure_connection()
        except Exception as exc:
            db_ok = False
            db_detail = f"Database error: {exc}"
        checks.append(_check("API / Database", "ok" if db_ok else "problem", db_detail))

        buyers = AppUser.objects.filter(account_type=AppUser.ACCOUNT_USER).count()
        sellers = AppUser.objects.filter(account_type=AppUser.ACCOUNT_PROVIDER).count()
        active_buyers = AppUser.objects.filter(account_type=AppUser.ACCOUNT_USER, is_active=True).count()
        active_sellers = AppUser.objects.filter(account_type=AppUser.ACCOUNT_PROVIDER, is_active=True).count()
        blocked_users = AppUser.objects.filter(is_active=False).count()

        buyer_status = "ok"
        if buyers and active_buyers == 0:
            buyer_status = "problem"
        elif blocked_users >= 10:
            buyer_status = "attention"
        checks.append(
            _check(
                "Buyer accounts",
                buyer_status,
                f"{active_buyers} active / {buyers} total"
                + (f" · {blocked_users} blocked/deactivated" if blocked_users else ""),
                "/admin/users",
            )
        )

        seller_status = "ok"
        if sellers and active_sellers == 0:
            seller_status = "problem"
        checks.append(
            _check(
                "Seller accounts",
                seller_status,
                f"{active_sellers} active / {sellers} total",
                "/admin/providers?status=all",
            )
        )

        pending_kyc = ProviderApplication.objects.filter(status=ProviderApplication.STATUS_PENDING).count()
        rejected_kyc = ProviderApplication.objects.filter(status=ProviderApplication.STATUS_REJECTED).count()
        verified_kyc = ProviderApplication.objects.filter(status=ProviderApplication.STATUS_VERIFIED).count()
        kyc_status = "ok"
        if pending_kyc >= 25:
            kyc_status = "problem"
        elif pending_kyc > 0:
            kyc_status = "attention"
        checks.append(
            _check(
                "Seller KYC / verification",
                kyc_status,
                f"{verified_kyc} verified · {pending_kyc} pending · {rejected_kyc} rejected",
                "/admin/providers?status=pending",
            )
        )

        id_requests = ProviderIdCard.objects.filter(access_status=ProviderIdCard.ACCESS_REQUESTED).count()
        id_blocked = ProviderIdCard.objects.filter(access_status=ProviderIdCard.ACCESS_BLOCKED).count()
        id_status = "ok"
        if id_requests >= 20:
            id_status = "problem"
        elif id_requests > 0:
            id_status = "attention"
        checks.append(
            _check(
                "ID card downloads",
                id_status,
                f"{id_requests} requests waiting · {id_blocked} blocked cards",
                "/admin/id-cards?status=requested",
            )
        )

        pending_listings = Listing.objects.filter(status=Listing.STATUS_PENDING).count()
        live_listings = Listing.objects.filter(status=Listing.STATUS_APPROVED).count()
        deactivated = Listing.objects.filter(status=Listing.STATUS_DEACTIVATED).count()
        listing_status = "ok"
        if pending_listings >= 40:
            listing_status = "problem"
        elif pending_listings > 0:
            listing_status = "attention"
        checks.append(
            _check(
                "Listings feed",
                listing_status,
                f"{live_listings} live · {pending_listings} awaiting approval · {deactivated} deactivated",
                "/admin/listing-queue",
            )
        )

        open_reports = Complaint.objects.exclude(status=Complaint.STATUS_RESOLVED).count()
        high_reports = Complaint.objects.filter(severity=Complaint.SEVERITY_HIGH).exclude(
            status=Complaint.STATUS_RESOLVED
        ).count()
        report_status = "ok"
        if high_reports > 0:
            report_status = "problem"
        elif open_reports > 0:
            report_status = "attention"
        checks.append(
            _check(
                "Reports & trust",
                report_status,
                f"{open_reports} open tickets · {high_reports} high severity",
                "/admin/reports",
            )
        )

        checks.append(
            _check(
                "App login / auth",
                "ok" if db_ok else "problem",
                "Login API ready" if db_ok else "Auth depends on database — fix DB first",
                "/admin/users",
            )
        )

        problem_count = sum(1 for item in checks if item["status"] == "problem")
        attention_count = sum(1 for item in checks if item["status"] == "attention")
        if problem_count:
            overall = "problems"
            label = "Problems detected"
        elif attention_count:
            overall = "attention"
            label = "Needs attention"
        else:
            overall = "operational"
            label = "Operational"

        return Response(
            {
                "overall": overall,
                "label": label,
                "checked_at": now,
                "problem_count": problem_count,
                "attention_count": attention_count,
                "checks": checks,
                "counts": {
                    "buyers": buyers,
                    "sellers": sellers,
                    "pending_kyc": pending_kyc,
                    "pending_listings": pending_listings,
                    "live_listings": live_listings,
                    "open_reports": open_reports,
                    "blocked_users": blocked_users,
                },
            }
        )
