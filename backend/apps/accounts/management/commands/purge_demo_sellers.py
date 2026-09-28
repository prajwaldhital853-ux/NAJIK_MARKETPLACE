"""Remove demo seller accounts seeded for testing (safe, idempotent)."""

from django.core.management.base import BaseCommand

from apps.accounts.demo_seed_service import purge_demo_sellers


class Command(BaseCommand):
    help = "Delete demo seller accounts (@najik-demo.com, demo phone range, demo_seed flag)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print how many rows would be deleted without deleting.",
        )

    def handle(self, *args, **options):
        if options.get("dry_run"):
            from django.db.models import Q

            from apps.accounts.demo_catalog import PHONE_BASE, PHONE_MAX_SELLERS
            from apps.accounts.models import AppUser
            from apps.listings.models import Listing
            from apps.verification.models import ProviderApplication

            phone_max = PHONE_BASE + PHONE_MAX_SELLERS - 1
            demo_phones = [f"+{n}" for n in range(PHONE_BASE, phone_max + 1)]
            demo_app_owner_ids = ProviderApplication.objects.filter(
                profile_data__demo_seed=True,
            ).values_list("owner_id", flat=True)
            demo_listing_owner_ids = Listing.objects.filter(
                extras__demo_seed=True,
            ).values_list("owner_id", flat=True)
            count = AppUser.objects.filter(
                Q(email__iendswith="@najik-demo.com")
                | Q(phone__in=demo_phones)
                | Q(id__in=demo_app_owner_ids)
                | Q(id__in=demo_listing_owner_ids)
            ).distinct().count()
            self.stdout.write(f"Would delete {count} demo seller account(s).")
            return

        removed = purge_demo_sellers()
        if removed == 0:
            self.stdout.write("No demo sellers to remove.")
            return
        self.stdout.write(self.style.SUCCESS(f"Removed {removed} demo seller account(s)."))
