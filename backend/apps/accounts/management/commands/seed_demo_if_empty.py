"""Auto-seed demo marketplace on deploy when DEMO_SEED_ENABLED and DB is empty."""

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.accounts.demo_seed_service import run_demo_seed
from apps.listings.models import Listing


class Command(BaseCommand):
    help = "Seed demo sellers/listings when DEMO_SEED_ENABLED and fewer than 10 approved listings exist."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Seed even if some listings already exist.")
        parser.add_argument("--count", type=int, default=200, help="Sellers to seed (default 200 = 1000 listings).")
        parser.add_argument("--listings-per-seller", type=int, default=5)

    def handle(self, *args, **options):
        if not getattr(settings, "DEMO_SEED_ENABLED", False):
            self.stdout.write("DEMO_SEED_ENABLED is false — skip auto demo seed.")
            return

        approved = Listing.objects.filter(status=Listing.STATUS_APPROVED).count()
        if approved >= 10 and not options["force"]:
            self.stdout.write(f"Already {approved} approved listings — skip auto demo seed.")
            return

        count = max(1, min(options["count"], 1000))
        per = max(1, min(options["listings_per_seller"], 10))
        self.stdout.write(f"Auto-seeding {count} demo sellers x {per} listings (skip photos for speed)...")

        result = run_demo_seed(
            seller_count=count,
            seller_offset=0,
            listings_per_seller=per,
            skip_photos=True,
            attach_photos=False,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo seed done: {result.total_demo_listings} listings, "
                f"{result.total_demo_sellers} sellers "
                f"(+{result.created_listings} new this run)."
            )
        )
