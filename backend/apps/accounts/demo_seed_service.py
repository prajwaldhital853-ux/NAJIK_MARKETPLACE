"""Shared demo seed logic — used by management command and admin API."""
from __future__ import annotations

import random
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from io import BytesIO

from django.core.files.base import ContentFile
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
API_MAX_SELLERS_PER_REQUEST = 40

PHOTO_COLORS = [
    (30, 125, 44),
    (29, 78, 216),
    (194, 65, 12),
    (126, 34, 206),
    (185, 28, 28),
]
_JPEG_CACHE: list[bytes] = []
_IMAGE_CACHE: dict[str, bytes] = {}


@dataclass
class DemoSeedResult:
    seller_offset: int = 0
    sellers_processed: int = 0
    created_users: int = 0
    created_apps: int = 0
    created_listings: int = 0
    photos_added: int = 0
    total_demo_sellers: int = 0
    total_demo_listings: int = 0
    next_seller_offset: int | None = None
    done: bool = False
    errors: list[str] = field(default_factory=list)


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
    photo_count = 3 + (start % 3)
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


def _seed_one_seller(
    idx: int,
    listings_per: int,
    password: str,
    use_network: bool,
    result: DemoSeedResult,
) -> None:
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
        result.created_users += 1

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
            app.nagrita.save(f"nagrita_{user.id}.jpg", _demo_jpeg("nagrita_demo.jpg", 0), save=False)
            app.photo.save(f"photo_{user.id}.jpg", _demo_jpeg("photo_demo.jpg", 1), save=False)
            app.save()
            result.created_apps += 1
        except Exception as exc:
            result.errors.append(f"KYC skipped for {user.full_name}: {exc}")

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
            result.created_listings += 1
        elif listing.lat is None or listing.lng is None:
            listing.lat = lat
            listing.lng = lng
            listing.save(update_fields=["lat", "lng", "updated_at"])

        try:
            result.photos_added += _attach_listing_photos(
                listing,
                listing_data["image_seed"],
                use_network=use_network,
            )
        except Exception as exc:
            result.errors.append(f"Photos skipped for {listing.title}: {exc}")


def run_demo_seed(
    *,
    seller_count: int = DEFAULT_SELLERS,
    seller_offset: int = 0,
    listings_per_seller: int = DEFAULT_LISTINGS_PER_SELLER,
    password: str = "demo123",
    skip_photos: bool = False,
    bump_cache: bool = True,
) -> DemoSeedResult:
    seller_count = max(1, min(seller_count, PHONE_MAX_SELLERS))
    seller_offset = max(0, min(seller_offset, PHONE_MAX_SELLERS - 1))
    listings_per = max(1, min(listings_per_seller, 10))
    use_network = not skip_photos

    end_index = min(seller_offset + seller_count, PHONE_MAX_SELLERS)
    result = DemoSeedResult(seller_offset=seller_offset)

    for idx in range(seller_offset, end_index):
        with transaction.atomic():
            _seed_one_seller(idx, listings_per, password, use_network, result)
        result.sellers_processed += 1

    demo_phones = [f"+{PHONE_BASE + i}" for i in range(PHONE_MAX_SELLERS)]
    result.total_demo_sellers = AppUser.objects.filter(
        account_type=AppUser.ACCOUNT_PROVIDER,
        phone__in=demo_phones,
    ).count()
    result.total_demo_listings = Listing.objects.filter(owner__phone__in=demo_phones).count()

    if end_index < PHONE_MAX_SELLERS:
        result.next_seller_offset = end_index
        result.done = False
    else:
        result.next_seller_offset = None
        result.done = True

    if bump_cache:
        try:
            bump_listing_feed_cache()
        except Exception:
            pass

    return result


def purge_demo_sellers() -> int:
    from django.db.models import Q

    from apps.accounts.demo_catalog import PHONE_BASE, PHONE_MAX_SELLERS

    phone_max = PHONE_BASE + PHONE_MAX_SELLERS - 1
    demo_phones = [f"+{n}" for n in range(PHONE_BASE, phone_max + 1)]
    demo_app_owner_ids = ProviderApplication.objects.filter(
        profile_data__demo_seed=True,
    ).values_list("owner_id", flat=True)
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
    if count:
        qs.delete()
    try:
        bump_listing_feed_cache()
    except Exception:
        pass
    return count
