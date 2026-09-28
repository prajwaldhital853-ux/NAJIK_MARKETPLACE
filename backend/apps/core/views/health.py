from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.utils import DatabaseError, OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.core.system_status import build_platform_status_checks
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import LISTING_PAGES, user_has_rbac
from apps.staff.schema import staff_auth_tables_ready


def _pending_migration_labels(limit: int = 8) -> list[str] | None:
    try:
        connection.ensure_connection()
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        labels = [f"{app_label}.{name}" for app_label, name in plan]
        return labels[:limit]
    except (DatabaseError, OperationalError, ProgrammingError):
        return None


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        payload = {"status": "ok", "service": "najik-api"}

        try:
            connection.ensure_connection()
        except (DatabaseError, OperationalError, ProgrammingError) as exc:
            payload["status"] = "degraded"
            payload["database"] = "unreachable"
            payload["hint"] = (
                "DATABASE_URL host is wrong or Postgres is down. "
                "On Render: Postgres → Internal Database URL → Web Service → DATABASE_URL."
            )
            payload["detail"] = str(exc)
            return Response(payload)

        pending = _pending_migration_labels()
        staff_auth_ready = staff_auth_tables_ready()
        payload["staff_auth_ready"] = staff_auth_ready
        payload["pending_migrations"] = len(pending) if pending is not None else -1

        if pending is None:
            payload["status"] = "degraded"
            payload["hint"] = "Could not read migration state — check DATABASE_URL."
        elif pending:
            payload["status"] = "degraded"
            payload["pending_migration_samples"] = pending
            payload["hint"] = (
                "Run python manage.py migrate on the API host "
                "(Render Start Command: bash scripts/render_start.sh)."
            )
        elif not staff_auth_ready:
            payload["status"] = "degraded"
            payload["hint"] = "Staff login security tables are missing — redeploy after migrate."
        return Response(payload)


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
