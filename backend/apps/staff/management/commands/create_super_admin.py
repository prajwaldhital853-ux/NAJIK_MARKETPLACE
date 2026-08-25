from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.staff.models import StaffUser
from apps.staff.rbac_seed import DEFAULT_STAFF_ACCOUNTS, ensure_default_staff_accounts, ensure_page_rbac


class Command(BaseCommand):
    help = "Create Super Admin and default staff accounts for each system role."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--name", default="Super Admin")
        parser.add_argument(
            "--skip-default-staff",
            action="store_true",
            help="Do not create default Admin/Moderator/etc. accounts",
        )

    def handle(self, *args, **options):
        ensure_page_rbac()

        email = options["email"].lower().strip()
        password = options["password"]
        super_admin = StaffUser.objects.filter(email__iexact=email).first()

        if super_admin:
            self.stdout.write(self.style.WARNING(f"Super Admin already exists: {super_admin.email}"))
        else:
            try:
                validate_password(password)
            except ValidationError as exc:
                raise CommandError("; ".join(exc.messages)) from exc
            if not StaffUser.validate_password_strength(password):
                raise CommandError(
                    "Password must contain at least 8 characters, "
                    "1 uppercase, 1 lowercase, 1 number, and 1 special character"
                )
            super_admin = StaffUser(
                email=email,
                full_name=options["name"],
                is_super_admin=True,
                is_active=True,
                must_change_password=False,
            )
            super_admin.save()
            super_admin.set_password(password)
            super_admin.save()
            self.stdout.write(self.style.SUCCESS(f"Created Super Admin: {super_admin.email}"))

        if not options["skip_default_staff"]:
            seeded = ensure_default_staff_accounts(created_by=super_admin)
            if seeded:
                self.stdout.write(self.style.SUCCESS("\nDefault staff accounts (must change password on first login):"))
                for row in seeded:
                    self.stdout.write(f"  [{row['role']}] {row['email']} / {row['password']}")
            else:
                self.stdout.write("Default staff accounts already exist (skipped).")

        self.stdout.write(self.style.SUCCESS("\nReference — default role logins:"))
        self.stdout.write(f"  Super Admin: {email} / (password you provided)")
        for role_name, staff_email, staff_password, _ in DEFAULT_STAFF_ACCOUNTS:
            self.stdout.write(f"  {role_name}: {staff_email} / {staff_password}")
