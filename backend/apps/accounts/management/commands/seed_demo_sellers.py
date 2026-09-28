"""Seed demo seller accounts with listings — LOCAL DEV or when DEMO_SEED_ENABLED=true."""

from django.core.management.base import BaseCommand

from apps.accounts.demo_catalog import PHONE_BASE, PHONE_MAX_SELLERS
from apps.accounts.demo_seed_service import (
    DEFAULT_LISTINGS_PER_SELLER,
    DEFAULT_SELLERS,
    run_demo_seed,
)


class Command(BaseCommand):
    help = "Seed demo sellers with 1000+ listings, real names, Nepal addresses, and product photos"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=DEFAULT_SELLERS)
        parser.add_argument("--listings-per-seller", type=int, default=DEFAULT_LISTINGS_PER_SELLER)
        parser.add_argument("--password", type=str, default="demo123")
        parser.add_argument("--skip-photos", action="store_true")
        parser.add_argument("--seller-offset", type=int, default=0)

    def handle(self, *args, **options):
        result = run_demo_seed(
            seller_count=max(1, min(options["count"], PHONE_MAX_SELLERS)),
            seller_offset=max(0, options["seller_offset"]),
            listings_per_seller=max(1, min(options["listings_per_seller"], 10)),
            password=options["password"],
            skip_photos=options["skip_photos"],
        )
        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Demo seed batch complete"))
        self.stdout.write(f"  Sellers processed: {result.sellers_processed}")
        self.stdout.write(f"  New sellers: {result.created_users}")
        self.stdout.write(f"  New listings: {result.created_listings}")
        self.stdout.write(f"  Photos added: {result.photos_added}")
        self.stdout.write(f"  Total demo sellers: {result.total_demo_sellers}")
        self.stdout.write(f"  Total demo listings: {result.total_demo_listings}")
        if result.next_seller_offset is not None:
            self.stdout.write(f"  Next offset: {result.next_seller_offset}")
        self.stdout.write(f"\nSample login: +{PHONE_BASE} / {options['password']}")
