"""Initialize page-based RBAC with all permissions."""
from django.core.management.base import BaseCommand
from apps.staff.rbac_seed import ensure_page_rbac


class Command(BaseCommand):
    help = "Initialize page-based RBAC permissions and roles"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-run full permission/role assignment even if already seeded",
        )

    def handle(self, *args, **options):
        self.stdout.write("Setting up page-based RBAC...")
        result = ensure_page_rbac(force=options["force"])
        self.stdout.write(self.style.SUCCESS(
            f"\n[SUCCESS] Page-based RBAC setup complete! "
            f"({result['permissions']} permissions, {result['roles']} roles)"
        ))
