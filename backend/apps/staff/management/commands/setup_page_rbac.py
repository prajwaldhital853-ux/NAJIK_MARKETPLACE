"""Initialize page-based RBAC with all permissions."""
from django.core.management.base import BaseCommand
from apps.staff.models import Role, Permission, RolePermission


class Command(BaseCommand):
    help = "Initialize page-based RBAC permissions and roles"

    def handle(self, *args, **options):
        self.stdout.write("Setting up page-based RBAC...")

        # Create all page permissions
        permissions = self._create_permissions()
        self.stdout.write(f"Created {len(permissions)} permissions")

        # Create or update system roles
        roles = self._create_roles()
        self.stdout.write(f"Created {len(roles)} roles")

        # Assign permissions to roles
        self._assign_permissions(roles, permissions)
        self.stdout.write("Assigned permissions to roles")

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Page-based RBAC setup complete!"))

    def _create_permissions(self):
        """Create all page-level permissions."""
        pages = [
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

        actions = ["view", "create", "update", "delete"]
        permissions = {}

        for page_code, page_name in pages:
            for action in actions:
                code = f"{page_code}.{action}"
                perm, created = Permission.objects.get_or_create(
                    code=code,
                    defaults={
                        "page": page_code,
                        "action": action,
                        "description": f"{action.capitalize()} access to {page_name}"
                    }
                )
                if created:
                    self.stdout.write(f"  + {code}")
                permissions[code] = perm

        return permissions

    def _create_roles(self):
        """Create system roles."""
        role_configs = [
            ("Super Admin", "Full system access with all permissions", True),
            ("Admin", "Full administrative access except staff management", True),
            ("Moderator", "Content moderation and user management", True),
            ("Verification Officer", "KYC and user verification", True),
            ("Support Agent", "User support and basic operations", True),
            ("Business Manager", "Analytics, payments, and business operations", True),
        ]

        roles = {}
        for name, description, is_system in role_configs:
            role, created = Role.objects.get_or_create(
                name=name,
                defaults={
                    "description": description,
                    "is_system_role": is_system,
                }
            )
            if created:
                self.stdout.write(f"  + {name}")
            roles[name] = role

        return roles

    def _assign_permissions(self, roles, permissions):
        """Assign permissions to roles based on their function."""
        
        # Super Admin - gets everything (handled in model via is_super_admin)
        
        # Admin - everything except staff management
        admin_perms = [
            p for code, p in permissions.items()
            if not code.startswith("staff_management")
        ]
        self._grant_permissions(roles["Admin"], admin_perms)

        # Moderator - listings, reports, users (view/update only)
        moderator_perms = [
            permissions.get(p) for p in [
                "dashboard.view",
                "user_management.view", "user_management.update",
                "property_management.view", "property_management.update",
                "job_management.view", "job_management.update",
                "service_management.view", "service_management.update",
                "electronics_management.view", "electronics_management.update",
                "other_listings.view", "other_listings.update",
                "reports_complaints.view", "reports_complaints.update",
                "reviews_ratings.view", "reviews_ratings.update", "reviews_ratings.delete",
            ] if permissions.get(p)
        ]
        self._grant_permissions(roles["Moderator"], moderator_perms)

        # Verification Officer - KYC and user view
        verification_perms = [
            permissions.get(p) for p in [
                "dashboard.view",
                "user_management.view",
                "kyc_verification.view", "kyc_verification.update",
            ] if permissions.get(p)
        ]
        self._grant_permissions(roles["Verification Officer"], verification_perms)

        # Support Agent - view most things, edit users and notifications
        support_perms = [
            permissions.get(p) for p in [
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
            ] if permissions.get(p)
        ]
        self._grant_permissions(roles["Support Agent"], support_perms)

        # Business Manager - analytics, payments, ads
        business_perms = [
            permissions.get(p) for p in [
                "dashboard.view",
                "analytics.view",
                "seller_payments.view", "seller_payments.update",
                "ads_promotions.view", "ads_promotions.create", "ads_promotions.update", "ads_promotions.delete",
                "orders_bookings.view",
            ] if permissions.get(p)
        ]
        self._grant_permissions(roles["Business Manager"], business_perms)

    def _grant_permissions(self, role, permissions):
        """Grant list of permissions to a role."""
        for perm in permissions:
            if perm:
                RolePermission.objects.get_or_create(
                    role=role,
                    permission=perm
                )
