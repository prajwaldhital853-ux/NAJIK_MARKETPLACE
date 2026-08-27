from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.core.system_status import build_platform_status_checks
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import LISTING_PAGES, user_has_rbac


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        return Response({"status": "ok", "service": "najik-api"})


def _staff_can_see_status_check(user, check: dict) -> bool:
    if getattr(user, "is_super_admin", False):
        return True
    page = check.get("rbac_page")
    if page is None:
        return True
    if page == "any_listing":
        return any(user_has_rbac(user, listing_page, "view") for listing_page in LISTING_PAGES)
    return user_has_rbac(user, page, "view")


def _visible_status_checks(user, checks: list[dict]) -> list[dict]:
    visible = [check for check in checks if _staff_can_see_status_check(user, check)]
    return [{k: v for k, v in item.items() if k != "rbac_page"} for item in visible]


class StaffSystemStatusView(APIView):
    """Platform configuration health for the admin sidebar (not pending KYC/listings/reports)."""

    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        checks = _visible_status_checks(request.user, build_platform_status_checks())

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
                "checked_at": timezone.now().isoformat(),
                "problem_count": problem_count,
                "attention_count": attention_count,
                "checks": checks,
            }
        )
