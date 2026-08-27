"""Build platform-level operational checks for the admin sidebar (not pending work queues)."""
from django.conf import settings
from django.db import connection

from apps.staff.models import Permission, Role, StaffUser
from apps.staff.rbac_seed import ACTIONS, PAGE_DEFINITIONS, ROLE_DEFINITIONS


def _check(label: str, status: str, detail: str, href: str = "", rbac_page: str | None = "__unset__"):
    item = {
        "id": label.lower().replace(" ", "_").replace("/", "_"),
        "label": label,
        "ok": status == "ok",
        "status": status,
        "detail": detail,
        "href": href,
    }
    if rbac_page != "__unset__":
        item["rbac_page"] = rbac_page
    return item


def build_platform_status_checks() -> list[dict]:
    checks: list[dict] = []

    db_ok = True
    db_detail = "PostgreSQL connected · API responding"
    try:
        connection.ensure_connection()
    except Exception as exc:
        db_ok = False
        db_detail = f"Database error: {exc}"
    checks.append(_check("API / Database", "ok" if db_ok else "problem", db_detail, rbac_page=None))

    expected_perms = len(PAGE_DEFINITIONS) * len(ACTIONS)
    perm_count = Permission.objects.filter(page__isnull=False).count()
    system_roles = Role.objects.filter(is_system_role=True, is_active=True).count()
    if perm_count < expected_perms:
        rbac_status = "problem"
        rbac_detail = (
            f"{perm_count}/{expected_perms} page permissions in database · "
            "run python manage.py setup_page_rbac"
        )
    elif system_roles < len(ROLE_DEFINITIONS):
        rbac_status = "attention"
        rbac_detail = (
            f"{perm_count} permissions loaded · {system_roles}/{len(ROLE_DEFINITIONS)} system roles active"
        )
    else:
        rbac_status = "ok"
        rbac_detail = f"{perm_count} permissions · {system_roles} system roles · matrix ready"
    checks.append(
        _check(
            "RBAC permission matrix",
            rbac_status,
            rbac_detail,
            "/admin/staff",
            rbac_page="staff_management",
        )
    )

    active_staff = StaffUser.objects.filter(is_active=True)
    super_admins = active_staff.filter(is_super_admin=True).count()
    unassigned = active_staff.filter(is_super_admin=False, role__isnull=True).count()
    if super_admins == 0:
        staff_status = "problem"
        staff_detail = "No active Super Admin account — assign at least one"
    elif unassigned > 0:
        staff_status = "attention"
        staff_detail = (
            f"{unassigned} active staff without a role · {super_admins} super admin(s) · "
            f"{active_staff.count()} total active"
        )
    else:
        staff_status = "ok"
        staff_detail = f"{active_staff.count()} active staff · roles assigned"
    checks.append(
        _check(
            "Staff roles & access",
            staff_status,
            staff_detail,
            "/admin/staff",
            rbac_page="staff_management",
        )
    )

    security_notes: list[str] = []
    security_status = "ok"
    if settings.DEBUG:
        security_status = "attention"
        security_notes.append("DEBUG=True (development mode)")
    else:
        security_notes.append("Production mode")
        if getattr(settings, "OTP_STUB", False):
            security_status = "attention"
            security_notes.append("OTP_STUB enabled — use real SMS/email in production")
        if not getattr(settings, "SECURE_SSL_REDIRECT", False):
            security_status = "problem"
            security_notes.append("HTTPS redirect disabled")
        else:
            security_notes.append("HTTPS enforced")
        cors = [o for o in settings.CORS_ALLOWED_ORIGINS if o]
        local_only = cors and all("localhost" in o or "127.0.0.1" in o for o in cors)
        if not cors or local_only:
            if security_status != "problem":
                security_status = "attention"
            security_notes.append("CORS origins look local-only — set production admin URL")
        else:
            security_notes.append(f"CORS configured ({len(cors)} origin(s))")

    if settings.PASSWORD_HASHERS and "Argon2PasswordHasher" in settings.PASSWORD_HASHERS[0]:
        security_notes.append("Argon2 password hashing")
    checks.append(
        _check(
            "Security hardening",
            security_status,
            " · ".join(security_notes),
            "/admin/settings",
            rbac_page="settings",
        )
    )

    jwt_key = settings.SIMPLE_JWT.get("SIGNING_KEY") or ""
    auth_notes: list[str] = []
    auth_status = "ok"
    if not jwt_key or len(str(jwt_key)) < 32:
        auth_status = "problem"
        auth_notes.append("JWT signing key missing or too short")
    else:
        auth_notes.append("JWT signing configured")
    if "rest_framework_simplejwt.token_blacklist" in settings.INSTALLED_APPS:
        auth_notes.append("Token blacklist enabled")
    else:
        auth_status = "attention"
        auth_notes.append("Token blacklist not installed")
    google_ready = bool(settings.GOOGLE_CLIENT_IDS and settings.GOOGLE_CLIENT_SECRET)
    auth_notes.append("Google OAuth ready" if google_ready else "Google OAuth not fully configured")
    if not google_ready and auth_status == "ok":
        auth_status = "attention"
    checks.append(
        _check(
            "Auth services",
            auth_status,
            " · ".join(auth_notes),
            "/admin/settings",
            rbac_page="settings",
        )
    )

    platform_notes: list[str] = []
    platform_status = "ok"
    if settings.CLOUDINARY_URL:
        platform_notes.append("Cloudinary media storage active")
    elif settings.DEBUG:
        platform_notes.append("Local filesystem media (development)")
    else:
        platform_status = "problem"
        platform_notes.append("CLOUDINARY_URL not set — uploads may be lost on redeploy")
    if settings.REDIS_URL:
        platform_notes.append("Redis cache connected")
    elif settings.DEBUG:
        platform_notes.append("In-memory cache (development)")
    else:
        if platform_status == "ok":
            platform_status = "attention"
        platform_notes.append("REDIS_URL not set — admin live updates may not fan out across workers")
    if settings.ELASTICSEARCH_URL:
        platform_notes.append("Elasticsearch configured")
    checks.append(
        _check(
            "Platform storage & cache",
            platform_status,
            " · ".join(platform_notes),
            "/admin/general-app-control",
            rbac_page="app_control",
        )
    )

    return checks
