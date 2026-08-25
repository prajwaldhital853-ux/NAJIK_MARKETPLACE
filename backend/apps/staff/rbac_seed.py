"""Shared RBAC seed helpers — used by management command and API auto-init."""
from apps.staff.models import Role, Permission, RolePermission

PAGE_DEFINITIONS = [
    ("dashboard", "Dashboard"),
    ("user_management", "User Management"),
    ("property_management", "Property Management"),
    ("job_management", "Job Management"),
    ("service_management", "Service Management"),
    ("electronics_management", "Electronics Management"),
    ("other_listings", "Other Listings"),
    ("orders_bookings", "Orders & Bookings"),
    ("seller_payments", "Seller Payments"),
    ("kyc_verification", "KYC / Verification"),
    ("reports_complaints", "Reports & Complaints"),
    ("reviews_ratings", "Reviews & Ratings"),
    ("notifications", "Notifications"),
    ("ads_promotions", "Advertisements / Promotions"),
    ("analytics", "Analytics"),
    ("app_control", "General App Control"),
    ("staff_management", "Admin & Staff Management"),
    ("settings", "Settings"),
]

ACTIONS = ["view", "create", "update", "delete"]

ROLE_DEFINITIONS = [
    ("Super Admin", "Full system access with all permissions", True),
    ("Admin", "Full administrative access except staff management", True),
    ("Moderator", "Content moderation and user management", True),
    ("Verification Officer", "KYC and user verification", True),
    ("Support Agent", "User support and basic operations", True),
    ("Business Manager", "Analytics, payments, and business operations", True),
]

# Default demo staff logins (role name, email, temp password, display name)
DEFAULT_STAFF_ACCOUNTS = [
    ("Admin", "staff-admin@najik.com", "Admin@1234", "Default Admin"),
    ("Moderator", "moderator@najik.com", "Moderator@1234", "Default Moderator"),
    ("Verification Officer", "verification@najik.com", "Verify@1234", "Default Verification Officer"),
    ("Support Agent", "support@najik.com", "Support@1234", "Default Support Agent"),
    ("Business Manager", "business@najik.com", "Business@1234", "Default Business Manager"),
]


def ensure_page_rbac(force: bool = False) -> dict:
    """
    Ensure default permissions and system roles exist.
    Safe to call on every permissions/roles list request.
    """
    ready = (
        Permission.objects.filter(page__isnull=False).count() >= len(PAGE_DEFINITIONS) * len(ACTIONS)
        and Role.objects.filter(is_system_role=True, is_active=True).count() >= len(ROLE_DEFINITIONS)
    )
    if not force and ready:
        return {
            "permissions": Permission.objects.filter(page__isnull=False).count(),
            "roles": Role.objects.filter(is_active=True).count(),
        }

    permissions = _create_permissions()
    roles = _create_roles()
    _assign_permissions(roles, permissions)
    return {"permissions": len(permissions), "roles": len(roles)}


def _create_permissions():
    permissions = {}
    for page_code, page_name in PAGE_DEFINITIONS:
        for action in ACTIONS:
            code = f"{page_code}.{action}"
            perm, _ = Permission.objects.update_or_create(
                code=code,
                defaults={
                    "page": page_code,
                    "action": action,
                    "description": f"{action.capitalize()} access to {page_name}",
                },
            )
            permissions[code] = perm
    return permissions


def _create_roles():
    roles = {}
    for name, description, is_system in ROLE_DEFINITIONS:
        role, _ = Role.objects.update_or_create(
            name=name,
            defaults={
                "description": description,
                "is_system_role": is_system,
                "is_active": True,
            },
        )
        roles[name] = role
    return roles


def _assign_permissions(roles, permissions):
    admin_perms = [p for code, p in permissions.items() if not code.startswith("staff_management")]
    _grant_permissions(roles["Admin"], admin_perms)

    moderator_codes = [
        "dashboard.view",
        "user_management.view", "user_management.update",
        "property_management.view", "property_management.update",
        "job_management.view", "job_management.update",
        "service_management.view", "service_management.update",
        "electronics_management.view", "electronics_management.update",
        "other_listings.view", "other_listings.update",
        "reports_complaints.view", "reports_complaints.update",
        "reviews_ratings.view", "reviews_ratings.update", "reviews_ratings.delete",
    ]
    _grant_permissions(roles["Moderator"], [permissions[c] for c in moderator_codes if c in permissions])

    verification_codes = [
        "dashboard.view",
        "user_management.view",
        "kyc_verification.view", "kyc_verification.update",
    ]
    _grant_permissions(roles["Verification Officer"], [permissions[c] for c in verification_codes if c in permissions])

    support_codes = [
        "dashboard.view",
        "user_management.view", "user_management.update",
        "property_management.view",
        "job_management.view",
        "service_management.view",
        "electronics_management.view",
        "other_listings.view",
        "orders_bookings.view",
        "reports_complaints.view",
        "reviews_ratings.view",
        "notifications.view", "notifications.create",
    ]
    _grant_permissions(roles["Support Agent"], [permissions[c] for c in support_codes if c in permissions])

    business_codes = [
        "dashboard.view",
        "analytics.view",
        "seller_payments.view", "seller_payments.update",
        "ads_promotions.view", "ads_promotions.create", "ads_promotions.update", "ads_promotions.delete",
        "orders_bookings.view",
    ]
    _grant_permissions(roles["Business Manager"], [permissions[c] for c in business_codes if c in permissions])

    # Super Admin role gets all permissions for display (actual access via is_super_admin flag)
    _grant_permissions(roles["Super Admin"], list(permissions.values()))


def _grant_permissions(role, permission_list):
    for perm in permission_list:
        if perm:
            RolePermission.objects.get_or_create(role=role, permission=perm)


def ensure_default_staff_accounts(created_by=None) -> list[dict]:
    """
    Create default staff logins for each system role (except Super Admin).
    Idempotent — skips existing emails. All seeded staff must change password on first login.
    """
    from apps.staff.models import StaffUser

    ensure_page_rbac()
    roles = {r.name: r for r in Role.objects.filter(is_system_role=True, is_active=True)}
    created = []

    for role_name, email, password, full_name in DEFAULT_STAFF_ACCOUNTS:
        role = roles.get(role_name)
        if not role:
            continue

        staff = StaffUser.objects.filter(email__iexact=email).first()
        if staff:
            updates = []
            if not staff.is_super_admin and staff.role_id != role.id:
                staff.role = role
                updates.append("role")
            if not staff.is_active:
                staff.is_active = True
                updates.append("is_active")
            if updates:
                staff.save(update_fields=updates)
            continue

        if not StaffUser.validate_password_strength(password):
            continue

        staff = StaffUser(
            email=email.lower().strip(),
            full_name=full_name,
            role=role,
            is_active=True,
            is_super_admin=False,
            must_change_password=True,
            created_by=created_by,
        )
        staff.save()
        staff.set_password(password)
        staff.must_change_password = True
        staff.save(update_fields=["password", "must_change_password", "last_password_change"])

        created.append({
            "role": role_name,
            "email": staff.email,
            "password": password,
            "must_change_password": True,
        })

    return created
