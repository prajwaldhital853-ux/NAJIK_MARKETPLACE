from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.staff.models import StaffUser


class Command(BaseCommand):
    help = "Create the first Super Admin staff account (not a marketplace user)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--name", default="Super Admin")

    def handle(self, *args, **options):
        email = options["email"].lower().strip()
        password = options["password"]
        existing = StaffUser.objects.filter(email__iexact=email).first()
        if existing:
            self.stdout.write(self.style.WARNING(f"Super Admin already exists: {existing.email} (skipped)"))
            return
        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError("; ".join(exc.messages)) from exc
        staff = StaffUser(
            email=email,
            full_name=options["name"],
            is_super_admin=True,
            is_active=True,
        )
        # Save first to get pk in database, then set password
        staff.save()
        staff.set_password(password)
        staff.save()
        self.stdout.write(self.style.SUCCESS(f"Created Super Admin: {staff.email}"))
