"""
Management command to initialize default roles and permissions.
Run with: python manage.py setup_rbac
"""
from django.core.management.base import BaseCommand
from apps.staff.models import Role, Permission, RolePermission


class Command(BaseCommand):
    help = "Initialize RBAC: create default roles and permissions"

    def handle(self, *args, **options):
        self.stdout.write("Setting up RBAC...")

        # Create permissions
        permissions = self._create_permissions()
        self.stdout.write(self.style.SUCCESS(f"Created {len(permissions)} permissions"))

        # Create roles
        roles = self._create_roles()
        self.stdout.write(self.style.SUCCESS(f"Created {len(roles)} roles"))

        # Assign permissions to roles
        self._assign_permissions(roles, permissions)
        self.stdout.write(self.style.SUCCESS("Assigned permissions to roles"))

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] RBAC setup complete!"))

    def _create_permissions(self):
        """Create all permissions."""
        permissions_data = [
            # Users
            ("users", "view", "View users and their profiles"),
            ("users", "create", "Create new user accounts"),
            ("users", "update", "Update user information"),
            ("users", "delete", "Delete user accounts"),
            ("users", "export", "Export user data"),

            # Listings
            ("listings", "view", "View all listings"),
            ("listings", "create", "Create listings (admin-posted)"),
            ("listings", "update", "Update listing details"),
            ("listings", "delete", "Delete listings"),
            ("listings", "approve", "Approve pending listings"),
            ("listings", "reject", "Reject listings"),
            ("listings", "export", "Export listing data"),

            # KYC & Verification
            ("kyc", "view", "View KYC applications"),
            ("kyc", "update", "Update KYC status"),
            ("kyc", "approve", "Approve KYC applications"),
            ("kyc", "reject", "Reject KYC applications"),

            # Payments
            ("payments", "view", "View payment transactions"),
            ("payments", "create", "Process manual payments"),
            ("payments", "update", "Update payment status"),
            ("payments", "approve", "Approve payment requests"),
            ("payments", "reject", "Reject payment requests"),
            ("payments", "export", "Export payment data"),

            # Reports
            ("reports", "view", "View user reports"),
            ("reports", "update", "Update report status"),
            ("reports", "delete", "Delete reports"),

            # Analytics
            ("analytics", "view", "View analytics and insights"),
            ("analytics", "export", "Export analytics data"),

            # Staff Management
            ("staff", "view", "View staff members"),
            ("staff", "create", "Create new staff accounts"),
            ("staff", "update", "Update staff information"),
            ("staff", "delete", "Delete staff accounts"),

            # Settings
            ("settings", "view", "View system settings"),
            ("settings", "update", "Update system settings"),

            # Notifications
            ("notifications", "view", "View notifications"),
            ("notifications", "create", "Send notifications"),
            ("notifications", "delete", "Delete notifications"),

            # Ads & Promotions
            ("ads", "view", "View ads and promotions"),
            ("ads", "create", "Create ads"),
            ("ads", "update", "Update ads"),
            ("ads", "delete", "Delete ads"),
            ("ads", "approve", "Approve ads"),
        ]

        permissions = {}
        for resource, action, description in permissions_data:
            code = f"{resource}.{action}"
            perm, created = Permission.objects.get_or_create(
                code=code,
                defaults={
                    "resource": resource,
                    "action": action,
                    "description": description,
                }
            )
            permissions[code] = perm
            if created:
                self.stdout.write(f"  + {code}")

        return permissions

    def _create_roles(self):
        """Create default roles."""
        roles_data = [
            (Role.SUPER_ADMIN, "Super Admin", "Full system access, can manage all staff and settings"),
            (Role.ADMIN, "Admin", "Manage users, listings, and day-to-day operations"),
            (Role.MODERATOR, "Moderator", "Review and moderate content, handle user reports"),
            (Role.VERIFICATION_OFFICER, "Verification Officer", "Handle KYC and user verification"),
            (Role.SUPPORT_AGENT, "Support Agent", "Provide customer support, view data"),
            (Role.BUSINESS_MANAGER, "Business Manager", "Manage payments, analytics, and business operations"),
        ]

        roles = {}
        for code, name, description in roles_data:
            role, created = Role.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": description,
                }
            )
            roles[code] = role
            if created:
                self.stdout.write(f"  + {name}")

        return roles

    def _assign_permissions(self, roles, permissions):
        """Assign permissions to roles based on their responsibilities."""

        # Super Admin: All permissions (handled by is_super_admin flag)
        # No need to explicitly assign

        # Admin: Almost everything except staff management
        admin_perms = [
            "users.view", "users.create", "users.update", "users.delete", "users.export",
            "listings.view", "listings.create", "listings.update", "listings.delete",
            "listings.approve", "listings.reject", "listings.export",
            "kyc.view", "kyc.update", "kyc.approve", "kyc.reject",
            "payments.view", "payments.create", "payments.update", "payments.approve",
            "payments.reject", "payments.export",
            "reports.view", "reports.update", "reports.delete",
            "analytics.view", "analytics.export",
            "notifications.view", "notifications.create", "notifications.delete",
            "ads.view", "ads.create", "ads.update", "ads.delete", "ads.approve",
            "settings.view",
        ]
        self._assign_role_permissions(roles[Role.ADMIN], admin_perms, permissions)

        # Moderator: Content moderation
        moderator_perms = [
            "users.view",
            "listings.view", "listings.update", "listings.approve", "listings.reject",
            "reports.view", "reports.update", "reports.delete",
            "notifications.view", "notifications.create",
            "ads.view", "ads.approve",
        ]
        self._assign_role_permissions(roles[Role.MODERATOR], moderator_perms, permissions)

        # Verification Officer: KYC and verifications
        verification_perms = [
            "users.view",
            "kyc.view", "kyc.update", "kyc.approve", "kyc.reject",
            "listings.view",
            "notifications.view", "notifications.create",
        ]
        self._assign_role_permissions(roles[Role.VERIFICATION_OFFICER], verification_perms, permissions)

        # Support Agent: Read-only + basic actions
        support_perms = [
            "users.view", "users.update",
            "listings.view",
            "reports.view",
            "notifications.view", "notifications.create",
            "analytics.view",
        ]
        self._assign_role_permissions(roles[Role.SUPPORT_AGENT], support_perms, permissions)

        # Business Manager: Analytics, payments
        business_perms = [
            "users.view", "users.export",
            "listings.view", "listings.export",
            "payments.view", "payments.update", "payments.export",
            "analytics.view", "analytics.export",
            "ads.view", "ads.create", "ads.update",
            "notifications.view", "notifications.create",
        ]
        self._assign_role_permissions(roles[Role.BUSINESS_MANAGER], business_perms, permissions)

    def _assign_role_permissions(self, role, permission_codes, permissions):
        """Assign list of permissions to a role."""
        for code in permission_codes:
            if code in permissions:
                RolePermission.objects.get_or_create(
                    role=role,
                    permission=permissions[code]
                )
