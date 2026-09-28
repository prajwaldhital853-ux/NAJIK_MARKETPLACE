"""Remove demo seller accounts seeded for testing (safe, idempotent)."""

from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.accounts.demo_catalog import PHONE_BASE, PHONE_MAX_SELLERS
from apps.accounts.models import AppUser
from apps.listings.models import Listing
from apps.verification.models import ProviderApplication

PHONE_MAX = PHONE_BASE + PHONE_MAX_SELLERS - 1


class Command(BaseCommand):
    help = "Delete demo seller accounts (@najik-demo.com, demo phone range, demo_seed flag)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print how many rows would be deleted without deleting.",
        )

    def handle(self, *args, **options):
        dry_run = bool(options.get("dry_run"))

        demo_app_owner_ids = ProviderApplication.objects.filter(
            profile_data__demo_seed=True,
        ).values_list("owner_id", flat=True)

        demo_phones = [f"+{n}" for n in range(PHONE_BASE, PHONE_MAX + 1)]
        demo_listing_owner_ids = Listing.objects.filter(
            extras__demo_seed=True,
        ).values_list("owner_id", flat=True)

        qs = AppUser.objects.filter(
            Q(email__iendswith="@najik-demo.com")
            | Q(phone__in=demo_phones)
            | Q(id__in=demo_app_owner_ids)
            | Q(id__in=demo_listing_owner_ids)
        ).distinct()

        count = qs.count()
        if count == 0:
            self.stdout.write("No demo sellers to remove.")
            return

        if dry_run:
            self.stdout.write(f"Would delete {count} demo seller account(s).")
            return

        deleted, detail = qs.delete()
        self.stdout.write(
            self.style.SUCCESS(f"Removed {count} demo seller account(s). Cascade: {detail}")
        )
