"""Seed demo seller accounts with listings — LOCAL DEV ONLY.

Default: 200 sellers x 5 listings = 1000 approved listings with real photos.
Not run on Render/production. Use purge_demo_sellers to clean up.
"""

import random
import urllib.error
import urllib.request
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.demo_catalog import (
    PHONE_BASE,
    PHONE_MAX_SELLERS,
    coords_for_city,
    listing_from_product,
    seller_profile,
)
from apps.accounts.models import AppUser
from apps.core.models import SellerWallet
from apps.listings.listing_cards import bump_listing_feed_cache
from apps.listings.models import Listing, ListingPhoto
from apps.verification.models import ProviderApplication

DEFAULT_SELLERS = 200
DEFAULT_LISTINGS_PER_SELLER = 5
BATCH_SIZE = 25

PHOTO_COLORS = [
    (30, 125, 44),
    (29, 78, 216),
    (194, 65, 12),
    (126, 34, 206),
    (185, 28, 28),
]
_JPEG_CACHE: list[bytes] = []
_IMAGE_CACHE: dict[str, bytes] = {}


def _jpeg_bytes(color: tuple[int, int, int]) -> bytes:
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (640, 480), color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle((24, 24, 616, 456), outline=(255, 255, 255), width=8)
    draw.ellipse((220, 140, 420, 340), fill=(255, 255, 255))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=82)
    return buf.getvalue()


def _photo_pool() -> list[bytes]:
    global _JPEG_CACHE
    if not _JPEG_CACHE:
        _JPEG_CACHE = [_jpeg_bytes(c) for c in PHOTO_COLORS]
    return _JPEG_CACHE


def _demo_jpeg(name: str, color_index: int = 0) -> ContentFile:
    pool = _photo_pool()
    return ContentFile(pool[color_index % len(pool)], name=name)


def _fetch_photo_bytes(seed: str) -> bytes | None:
    if seed in _IMAGE_CACHE:
        return _IMAGE_CACHE[seed]
    url = f"https://picsum.photos/seed/najik-{seed}/640/480"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NAJIK-Demo-Seed/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        if len(data) > 2000:
            _IMAGE_CACHE[seed] = data
            return data
    except (urllib.error.URLError, TimeoutError, OSError):
        return None
    return None


def _attach_listing_photos(listing: Listing, image_seed: str, *, use_network: bool) -> int:
    if listing.photos.exists():
        return 0

    pool = _photo_pool()
    start = hash(str(listing.id)) % len(pool)
    photo_count = 3 + (start % 3)  # 3-5 photos
    saved = 0

    for i in range(photo_count):
        seed = f"{image_seed}-{i}"
        raw = _fetch_photo_bytes(seed) if use_network else None
        if raw is None:
            raw = pool[(start + i) % len(pool)]

        photo = ListingPhoto(listing=listing, sort_order=i)
        filename = f"demo_{listing.id}_{i}.jpg"
        photo.image.save(filename, ContentFile(raw, name=filename), save=False)
        photo.save()
        saved += 1

    return saved


class Command(BaseCommand):
    help = "Seed demo sellers with 1000+ listings, real names, Nepal addresses, and product photos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=DEFAULT_SELLERS,
            help=f"Number of demo sellers (default: {DEFAULT_SELLERS})",
        )
        parser.add_argument(
            "--listings-per-seller",
            type=int,
            default=DEFAULT_LISTINGS_PER_SELLER,
            help=f"Listings per seller (default: {DEFAULT_LISTINGS_PER_SELLER})",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="demo123",
            help="Password for all demo seller accounts",
        )
        parser.add_argument(
            "--skip-photos",
            action="store_true",
            help="Use colored placeholder JPEGs instead of downloading real photos",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=BATCH_SIZE,
            help="Commit every N sellers (default: 25)",
        )

    def handle(self, *args, **options):
        seller_count = max(1, min(options["count"], PHONE_MAX_SELLERS))
        listings_per = max(1, min(options["listings_per_seller"], 10))
        password = options["password"]
        use_network = not options["skip_photos"]
        batch_size = max(5, options["batch_size"])
        target_listings = seller_count * listings_per

        created_users = 0
        created_listings = 0
        created_apps = 0
        photos_added = 0

        self.stdout.write(
            f"Seeding {seller_count} demo sellers x {listings_per} listings "
            f"= {target_listings} target listings..."
        )
        if use_network:
            self.stdout.write("Downloading real product photos from picsum.photos (cached per product type)...")

        for idx in range(seller_count):
            if idx % batch_size == 0:
                self.stdout.write(f"  ... seller batch starting at {idx + 1}/{seller_count}")

            with transaction.atomic():
                seller_data = seller_profile(idx)
                user = AppUser.objects.filter(phone=seller_data["phone"]).first()

                if not user:
                    user = AppUser.objects.create_user(
                        phone=seller_data["phone"],
                        email=seller_data["email"],
                        full_name=seller_data["full_name"],
                        account_type=AppUser.ACCOUNT_PROVIDER,
                        address=seller_data["address"],
                        password=password,
                        phone_verified=True,
                        email_verified=True,
                    )
                    created_users += 1

                if not ProviderApplication.objects.filter(owner=user).exists():
                    try:
                        app = ProviderApplication(
                            owner=user,
                            full_name=seller_data["full_name"],
                            address=seller_data["address"],
                            contact=seller_data["phone"],
                            phone=seller_data["phone"],
                            email=seller_data["email"],
                            service_type=seller_data["service_type"],
                            status=ProviderApplication.STATUS_VERIFIED,
                            reviewed_at=timezone.now(),
                            profile_data={
                                "business_name": seller_data["business_name"],
                                "demo_seed": True,
                            },
                        )
                        app.nagrita.save(
                            f"nagrita_{user.id}.jpg", _demo_jpeg("nagrita_demo.jpg", 0), save=False
                        )
                        app.photo.save(f"photo_{user.id}.jpg", _demo_jpeg("photo_demo.jpg", 1), save=False)
                        app.save()
                        created_apps += 1
                    except Exception as exc:
                        self.stdout.write(
                            self.style.WARNING(f"  [!] KYC skipped for {user.full_name}: {exc}")
                        )

                SellerWallet.objects.get_or_create(
                    provider=user,
                    defaults={"balance_paisa": random.randint(800000, 3500000)},
                )

                for li in range(listings_per):
                    product_index = idx * listings_per + li
                    listing_data = listing_from_product(product_index, idx)
                    lat, lng = coords_for_city(listing_data["city"])

                    listing, created = Listing.objects.get_or_create(
                        owner=user,
                        title=listing_data["title"],
                        defaults={
                            "category": listing_data["category"],
                            "subcategory": listing_data["subcategory"],
                            "description": listing_data["description"],
                            "price": str(listing_data["price"]),
                            "negotiable": listing_data["negotiable"],
                            "location": listing_data["location"],
                            "city": listing_data["city"],
                            "district": listing_data["district"],
                            "lat": lat,
                            "lng": lng,
                            "contact_name": seller_data["full_name"],
                            "contact_phone": seller_data["phone"],
                            "contact_email": seller_data["email"],
                            "contact_via": Listing.CONTACT_PHONE,
                            "status": Listing.STATUS_APPROVED,
                            "reviewed_at": timezone.now(),
                            "view_count": random.randint(15, 1200),
                            "extras": {
                                "dealType": listing_data["subcategory"],
                                "demo_seed": True,
                            },
                        },
                    )
                    if created:
                        created_listings += 1
                    elif listing.lat is None or listing.lng is None:
                        listing.lat = lat
                        listing.lng = lng
                        listing.save(update_fields=["lat", "lng", "updated_at"])

                    try:
                        photos_added += _attach_listing_photos(
                            listing,
                            listing_data["image_seed"],
                            use_network=use_network,
                        )
                    except Exception as photo_exc:
                        self.stdout.write(
                            self.style.WARNING(f"  [!] Photos skipped: {photo_exc}")
                        )

        demo_phones = [f"+{PHONE_BASE + i}" for i in range(seller_count)]
        total_sellers = AppUser.objects.filter(
            account_type=AppUser.ACCOUNT_PROVIDER,
            phone__in=demo_phones,
        ).count()
        total_listings = Listing.objects.filter(owner__phone__in=demo_phones).count()

        try:
            bump_listing_feed_cache()
        except Exception:
            pass

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Demo seed complete"))
        self.stdout.write(f"  New sellers this run: {created_users}")
        self.stdout.write(f"  New verified KYC apps: {created_apps}")
        self.stdout.write(f"  New listings this run: {created_listings}")
        self.stdout.write(f"  Photos attached this run: {photos_added}")
        self.stdout.write(f"  Unique photo downloads cached: {len(_IMAGE_CACHE)}")
        self.stdout.write(f"  Total demo sellers in DB: {total_sellers}")
        self.stdout.write(f"  Total demo listings in DB: {total_listings}")
        self.stdout.write("\nSample seller login (mobile app):")
        self.stdout.write(f"  Phone: +{PHONE_BASE}")
        self.stdout.write(f"  Password: {password}")
        self.stdout.write("\nOptional: python manage.py reindex_listings --batch 500")
