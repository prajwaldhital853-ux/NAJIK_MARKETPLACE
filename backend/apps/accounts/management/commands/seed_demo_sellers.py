"""Seed demo seller accounts with listings — LOCAL DEV ONLY.

Not run on Render/production. Use purge_demo_sellers to clean up demo rows.

Load test example:
  python manage.py seed_demo_sellers --load-test
"""

import random
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import models
from django.utils import timezone

from apps.accounts.models import AppUser
from apps.core.models import SellerWallet
from apps.listings.models import Listing, ListingPhoto
from apps.verification.models import ProviderApplication

SELLER_COUNT = 100
MAX_SELLER_COUNT = 5000
LISTINGS_PER_SELLER = 2
PHONE_BASE = 9779841234501  # +9779841234501 ..

FIRST_NAMES = [
    "Ramesh", "Sita", "Bikash", "Anita", "Suresh", "Maya", "Prakash", "Sunita", "Rajesh", "Pooja",
    "Amit", "Deepa", "Kiran", "Nisha", "Arjun", "Priya", "Sanjay", "Kavita", "Manoj", "Rekha",
    "Hari", "Gita", "Dipesh", "Anjali", "Ravi", "Sangita", "Nabin", "Laxmi", "Ashok", "Rita",
    "Binod", "Mina", "Gopal", "Sarita", "Prem", "Kalpana", "Dinesh", "Parbati", "Yogesh", "Shanti",
]

LAST_NAMES = [
    "Kumar", "Sharma", "Thapa", "Rai", "Karki", "Gurung", "Shrestha", "Magar", "Tamang", "Adhikari",
    "Pandey", "Joshi", "Bhandari", "Maharjan", "Basnet", "Kc", "Dahal", "Bhattarai", "Nepal", "Lama",
]

LOCATIONS = [
    ("Thamel, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Patan Dhoka, Lalitpur", "Lalitpur", "Lalitpur"),
    ("Baneshwor, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Kupondole, Lalitpur", "Lalitpur", "Lalitpur"),
    ("Bouddha, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Bhaktapur Durbar Square", "Bhaktapur", "Bhaktapur"),
    ("Pokhara Lakeside", "Pokhara", "Kaski"),
    ("Narayangadh, Chitwan", "Chitwan", "Chitwan"),
    ("Biratnagar, Morang", "Biratnagar", "Morang"),
    ("Butwal, Rupandehi", "Butwal", "Rupandehi"),
    ("Dharan, Sunsari", "Dharan", "Sunsari"),
    ("Hetauda, Makwanpur", "Hetauda", "Makwanpur"),
]

CITY_COORDS = {
    "Kathmandu": (27.7172, 85.3240),
    "Lalitpur": (27.6588, 85.3247),
    "Bhaktapur": (27.6727, 85.4298),
    "Pokhara": (28.2096, 83.9856),
    "Chitwan": (27.5833, 84.4167),
    "Biratnagar": (26.4525, 87.2718),
    "Butwal": (27.7000, 83.4500),
    "Dharan": (26.8147, 87.2797),
    "Hetauda": (27.4314, 85.0319),
}

SERVICE_TYPES = [
    "Electronics Repair", "Clothing & Accessories", "Vehicle Service", "Property Consultant",
    "Furniture Making", "Handicrafts", "Bakery & Sweets", "Beauty Services", "IT Services",
    "Event Management", "Plumbing", "Electrical Work", "Catering", "Photography", "Tutoring",
]

LISTING_TEMPLATES = [
    {
        "category": Listing.CATEGORY_MARKETPLACE,
        "subcategory": "Electronics",
        "titles": [
            "iPhone 13 Pro - Mint Condition",
            "Samsung Galaxy S22 Ultra",
            "MacBook Air M1 - Like New",
            "Sony WH-1000XM5 Headphones",
            "Canon EOS DSLR Camera",
            "Dell Inspiron Laptop 15 inch",
            "iPad Air 5th Gen WiFi",
            "JBL PartyBox Speaker",
        ],
        "price_range": (15000, 180000),
    },
    {
        "category": Listing.CATEGORY_MARKETPLACE,
        "subcategory": "Fashion",
        "titles": [
            "Designer Silk Saree Collection",
            "Men's Leather Jacket - Size L",
            "Branded Sneakers - Original",
            "Winter Pashmina Shawl Set",
            "Kids School Uniform Bundle",
            "Traditional Kurta Pajama Set",
        ],
        "price_range": (2500, 25000),
    },
    {
        "category": Listing.CATEGORY_VEHICLES,
        "subcategory": "Motorcycles",
        "titles": [
            "Honda CB Hornet 160R - 2020",
            "Yamaha FZ-S V3 - Well Maintained",
            "Bajaj Pulsar NS200 - Single Owner",
            "Royal Enfield Classic 350",
            "TVS Apache RTR 160",
        ],
        "price_range": (120000, 350000),
    },
    {
        "category": Listing.CATEGORY_VEHICLES,
        "subcategory": "Cars",
        "titles": [
            "Toyota Corolla 2015 - Excellent",
            "Hyundai Creta 2018 Automatic",
            "Maruti Swift 2019 Petrol",
            "Honda City 2017 - Low Mileage",
            "Suzuki Ertiga Family MPV",
        ],
        "price_range": (1800000, 4500000),
    },
    {
        "category": Listing.CATEGORY_PROPERTY,
        "subcategory": "Apartments",
        "titles": [
            "2BHK Apartment for Rent - Baneshwor",
            "1BHK Flat Near Ring Road",
            "Studio Apartment - Fully Furnished",
            "3BHK Penthouse with Parking",
        ],
        "price_range": (15000, 85000),
    },
    {
        "category": Listing.CATEGORY_PROPERTY,
        "subcategory": "Commercial",
        "titles": [
            "Commercial Shop Space - Thamel",
            "Office Space for Lease - 1200 sq ft",
            "Restaurant Space Ready to Move",
            "Warehouse for Rent - Industrial Area",
        ],
        "price_range": (25000, 120000),
    },
    {
        "category": Listing.CATEGORY_MARKETPLACE,
        "subcategory": "Furniture",
        "titles": [
            "Modern Sofa Set - 5 Seater",
            "Wooden Dining Table with 6 Chairs",
            "Queen Size Bed with Storage",
            "Office Desk and Chair Combo",
        ],
        "price_range": (8000, 65000),
    },
    {
        "category": Listing.CATEGORY_MARKETPLACE,
        "subcategory": "Handicrafts",
        "titles": [
            "Handmade Pashmina Shawls",
            "Brass Buddha Statue - 12 inch",
            "Nepali Thanka Painting",
            "Wooden Carved Window Panel",
        ],
        "price_range": (3500, 18000),
    },
    {
        "category": Listing.CATEGORY_SERVICES,
        "subcategory": "Food Services",
        "titles": [
            "Custom Birthday Cakes - Order Now",
            "Daily Fresh Bread & Pastries",
            "Home Tiffin Service - Monthly",
            "Catering for Events - 50+ Guests",
        ],
        "price_range": (500, 8000),
    },
    {
        "category": Listing.CATEGORY_SERVICES,
        "subcategory": "Beauty",
        "titles": [
            "Bridal Makeup Package",
            "Hair Spa Treatment - Special Offer",
            "Men's Grooming Package",
            "Nail Art & Manicure Service",
        ],
        "price_range": (1500, 18000),
    },
    {
        "category": Listing.CATEGORY_SERVICES,
        "subcategory": "IT Services",
        "titles": [
            "Gaming PC - RTX Build Ready",
            "Website Development - Business Sites",
            "Laptop Repair & Upgrade Service",
            "CCTV Installation Package",
        ],
        "price_range": (5000, 165000),
    },
    {
        "category": Listing.CATEGORY_SERVICES,
        "subcategory": "Events",
        "titles": [
            "Wedding Planning Package - Complete",
            "Birthday Party Decoration Service",
            "Corporate Event Management",
            "DJ and Sound System Rental",
        ],
        "price_range": (5000, 250000),
    },
    {
        "category": Listing.CATEGORY_JOBS,
        "subcategory": "Full-time",
        "titles": [
            "Sales Executive - Kathmandu",
            "Delivery Rider - Immediate Join",
            "Accountant - Lalitpur Office",
            "Store Manager - Retail Chain",
        ],
        "price_range": (18000, 45000),
    },
    {
        "category": Listing.CATEGORY_BUSINESS,
        "subcategory": "Retail",
        "titles": [
            "Grocery Store for Sale",
            "Pharmacy Business Transfer",
            "Tea Shop with Good Footfall",
            "Mobile Shop - Established Brand",
        ],
        "price_range": (500000, 3500000),
    },
    {
        "category": Listing.CATEGORY_NEARBY,
        "subcategory": "Local Deals",
        "titles": [
            "Neighborhood Handyman Service",
            "Local Bike Rental - Daily",
            "Home Cleaning Service Nearby",
            "Pet Grooming at Your Doorstep",
        ],
        "price_range": (800, 5000),
    },
]

PHOTO_COLORS = [
    (30, 125, 44),
    (29, 78, 216),
    (194, 65, 12),
    (126, 34, 206),
    (185, 28, 28),
]
_JPEG_CACHE: list[bytes] = []
_WEB_PHOTO_CACHE: list[bytes] = []

PICSUM_SEEDS = [
    "najik-load-a", "najik-load-b", "najik-load-c", "najik-load-d", "najik-load-e",
    "najik-load-f", "najik-load-g", "najik-load-h", "najik-load-i", "najik-load-j",
    "najik-load-k", "najik-load-l", "najik-load-m", "najik-load-n", "najik-load-o",
    "najik-load-p", "najik-load-q", "najik-load-r", "najik-load-s", "najik-load-t",
]

CATEGORY_PICSUM_SEEDS = {
    Listing.CATEGORY_PROPERTY: [
        "najik-property-house",
        "najik-property-apartment",
        "najik-property-room",
        "najik-property-building",
    ],
    Listing.CATEGORY_VEHICLES: [
        "najik-vehicle-car",
        "najik-vehicle-motorcycle",
        "najik-vehicle-truck",
        "najik-vehicle-scooter",
    ],
    Listing.CATEGORY_JOBS: [
        "najik-job-office",
        "najik-job-laptop",
        "najik-job-team",
        "najik-job-workplace",
    ],
    Listing.CATEGORY_SERVICES: [
        "najik-service-tools",
        "najik-service-food",
        "najik-service-salon",
        "najik-service-repair",
    ],
    Listing.CATEGORY_MARKETPLACE: [
        "najik-market-electronics",
        "najik-market-fashion",
        "najik-market-furniture",
        "najik-market-gadgets",
    ],
    Listing.CATEGORY_BUSINESS: [
        "najik-business-shop",
        "najik-business-store",
        "najik-business-cafe",
        "najik-business-market",
    ],
    Listing.CATEGORY_NEARBY: [
        "najik-nearby-local",
        "najik-nearby-street",
        "najik-nearby-bazaar",
        "najik-nearby-neighbourhood",
    ],
}

_CATEGORY_PHOTO_CACHE: dict[str, list[bytes]] = {}


def _coords_for_city(city: str) -> tuple[float, float]:
    lat, lng = CITY_COORDS.get(city, (27.7172, 85.3240))
    return lat + random.uniform(-0.015, 0.015), lng + random.uniform(-0.015, 0.015)


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


def _real_listing_photos(limit: int = 200):
    return list(
        ListingPhoto.objects.filter(
            listing__owner__email__isnull=False,
        )
        .exclude(listing__owner__email__iendswith="@najik-demo.com")
        .exclude(image="")
        .select_related("listing")
        .order_by("?")[:limit]
    )


def _copy_photo_from_source(listing: Listing, source: ListingPhoto, sort_order: int) -> bool:
    if not source.image:
        return False
    try:
        src_path = Path(source.image.path)
        if not src_path.is_file():
            return False
        ext = src_path.suffix or ".jpg"
        filename = f"demo_{listing.id}_photo_{sort_order}{ext}"
        photo = ListingPhoto(listing=listing, sort_order=sort_order)
        with src_path.open("rb") as handle:
            photo.image.save(filename, ContentFile(handle.read()), save=False)
        photo.save()
        return True
    except Exception:
        return False


def _download_picsum_seed(seed: str) -> bytes | None:
    url = f"https://picsum.photos/seed/{seed}/640/480.jpg"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NAJIK-LoadTest/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            if len(data) > 1024:
                return data
    except (urllib.error.URLError, TimeoutError, OSError):
        pass
    return None


def _category_photo_pool(category: str) -> list[bytes]:
    if category in _CATEGORY_PHOTO_CACHE:
        return _CATEGORY_PHOTO_CACHE[category]

    seeds = CATEGORY_PICSUM_SEEDS.get(category, PICSUM_SEEDS)
    pool: list[bytes] = []
    for index, seed in enumerate(seeds):
        blob = _download_picsum_seed(seed)
        if blob:
            pool.append(blob)
        else:
            pool.append(_jpeg_bytes(PHOTO_COLORS[index % len(PHOTO_COLORS)]))

    _CATEGORY_PHOTO_CACHE[category] = pool or _photo_pool()
    return _CATEGORY_PHOTO_CACHE[category]


def _web_photo_pool() -> list[bytes]:
    global _WEB_PHOTO_CACHE
    if _WEB_PHOTO_CACHE:
        return _WEB_PHOTO_CACHE

    pool: list[bytes] = []
    for seed in PICSUM_SEEDS:
        blob = _download_picsum_seed(seed)
        if blob:
            pool.append(blob)
        else:
            pool.append(_jpeg_bytes(PHOTO_COLORS[len(pool) % len(PHOTO_COLORS)]))

    _WEB_PHOTO_CACHE = pool or _photo_pool()
    return _WEB_PHOTO_CACHE


def _photo_count_for_listing(seller_index: int, listing_index: int) -> int:
    if seller_index == 0 and listing_index == 0:
        return 3
    if listing_index == 0 and seller_index % 100 == 0:
        return 3
    return 1


def _attach_photos_from_pool(
    listing: Listing,
    photo_count: int,
    pool: list[bytes] | None = None,
    *,
    refresh: bool = False,
) -> int:
    if listing.photos.exists() and not refresh:
        return 0
    if refresh:
        listing.photos.all().delete()

    blobs = pool or _category_photo_pool(listing.category)
    start = hash(str(listing.id)) % len(blobs)
    saved = 0
    for i in range(max(1, photo_count)):
        photo = ListingPhoto(listing=listing, sort_order=i)
        filename = f"load_{listing.id}_photo_{i}.jpg"
        blob = blobs[(start + i) % len(blobs)]
        photo.image.save(filename, ContentFile(blob, name=filename), save=False)
        photo.save()
        saved += 1
    return saved


def _attach_generated_photos(listing: Listing) -> int:
    pool = _photo_pool()
    start = hash(str(listing.id)) % len(pool)
    count = 4 + (start % 2)
    saved = 0
    for i in range(count):
        photo = ListingPhoto(listing=listing, sort_order=i)
        filename = f"g_{listing.id}_photo_{i}.jpg"
        photo.image.save(
            filename,
            ContentFile(pool[(start + i) % len(pool)], name=filename),
            save=False,
        )
        photo.save()
        saved += 1
    return saved


def _attach_listing_photos(listing: Listing, *, refresh: bool = False) -> int:
    """Add 4–5 photos from real seller listings, or generated colors as fallback."""
    if listing.photos.exists() and not refresh:
        return 0
    if refresh:
        listing.photos.all().delete()

    sources = _real_listing_photos(limit=80)
    if not sources:
        return _attach_generated_photos(listing)

    start = hash(str(listing.id)) % len(sources)
    count = min(4 + (start % 2), len(sources))
    saved = 0
    used = set()
    for i in range(count):
        source = sources[(start + i) % len(sources)]
        if source.id in used:
            continue
        used.add(source.id)
        if _copy_photo_from_source(listing, source, i):
            saved += 1
    if saved:
        return saved
    return _attach_generated_photos(listing)


def _pick_listings(seller_index: int, count: int):
    templates = list(LISTING_TEMPLATES)
    rows = []
    for listing_index in range(max(1, count)):
        template = templates[(seller_index + listing_index * 3) % len(templates)]
        loc = LOCATIONS[(seller_index + listing_index * 5) % len(LOCATIONS)]
        title = template["titles"][(seller_index + listing_index) % len(template["titles"])]
        if count > 1 or seller_index > 0:
            title = f"{title} #{seller_index + 1}"
        rows.append(
            {
                "title": title,
                "category": template["category"],
                "subcategory": template["subcategory"],
                "description": f"{title}. Quality listing from a verified NAJIK seller for load testing.",
                "price": random.randint(*template["price_range"]),
                "location": loc[0],
                "city": loc[1],
                "district": loc[2],
            }
        )
    return rows


def _pick_listing_pair(seller_index: int):
    rows = _pick_listings(seller_index, 2)
    return rows[0], rows[1]


def _backfill_missing_demo_photos() -> int:
    from django.db.models import Count
    from apps.listings.listing_cards import bump_listing_feed_cache

    missing = (
        Listing.objects.filter(
            owner__email__iendswith="@najik-demo.com",
            status=Listing.STATUS_APPROVED,
        )
        .annotate(photo_total=Count("photos"))
        .filter(photo_total=0)
    )
    added = 0
    for listing in missing.iterator(chunk_size=250):
        added += _attach_photos_from_pool(listing, 1)
    if added:
        bump_listing_feed_cache()
    return added


def _seller_profile(index: int):
    first = FIRST_NAMES[index % len(FIRST_NAMES)]
    last = LAST_NAMES[(index // len(FIRST_NAMES)) % len(LAST_NAMES)]
    suffix = index + 1
    full_name = f"{first} {last}"
    phone = f"+{PHONE_BASE + index}"
    slug = f"{first.lower()}.{last.lower()}.{suffix}"
    loc = LOCATIONS[index % len(LOCATIONS)]
    service = SERVICE_TYPES[index % len(SERVICE_TYPES)]
    return {
        "full_name": full_name,
        "phone": phone,
        "email": f"{slug}@najik-demo.com",
        "business_name": f"{last} {service.split()[0]}",
        "service_type": service,
        "address": loc[0],
        "city": loc[1],
        "district": loc[2],
    }


class Command(BaseCommand):
    help = "Seed demo seller accounts with approved listings (up to 5000 for load testing)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=SELLER_COUNT,
            help=f"Number of demo sellers to create (default: {SELLER_COUNT}, max: {MAX_SELLER_COUNT})",
        )
        parser.add_argument(
            "--listings-per-seller",
            type=int,
            default=LISTINGS_PER_SELLER,
            help=f"Approved listings per seller (default: {LISTINGS_PER_SELLER})",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="demo123",
            help="Password for all demo seller accounts",
        )
        parser.add_argument(
            "--load-test",
            action="store_true",
            help=f"Shortcut for --count {MAX_SELLER_COUNT} --listings-per-seller 1 --fast",
        )
        parser.add_argument(
            "--fast",
            action="store_true",
            help="Use web photo pool, skip KYC uploads, quieter logging (recommended for 1000+ sellers)",
        )
        parser.add_argument(
            "--refresh-photos",
            action="store_true",
            help="Replace existing demo listing photos on this run",
        )
        parser.add_argument(
            "--skip-if-enough",
            action="store_true",
            help="Exit without changes when demo seller count already meets --count (for Render deploys)",
        )

    def handle(self, *args, **options):
        load_test = bool(options.get("load_test"))
        count = MAX_SELLER_COUNT if load_test else max(1, min(options["count"], MAX_SELLER_COUNT))
        listings_per_seller = 1 if load_test else max(1, min(options["listings_per_seller"], 5))
        skip_if_enough = bool(options.get("skip_if_enough"))

        if skip_if_enough:
            demo_phones = [f"+{PHONE_BASE + i}" for i in range(count)]
            existing_sellers = AppUser.objects.filter(email__iendswith="@najik-demo.com").count()
            existing_listings = Listing.objects.filter(
                owner__email__iendswith="@najik-demo.com",
                status=Listing.STATUS_APPROVED,
            ).count()
            target_listings = count * listings_per_seller
            if existing_sellers >= count and existing_listings >= target_listings:
                backfilled = _backfill_missing_demo_photos()
                if backfilled:
                    self.stdout.write(f"Backfilled photos on {backfilled} demo listings that had none.")
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Load test data ready ({existing_sellers} sellers, {existing_listings} approved listings). Skipping seed."
                    )
                )
                return

        password = options["password"]
        fast = bool(options.get("fast")) or load_test
        refresh_photos = bool(options.get("refresh_photos"))
        created_users = 0
        created_listings = 0
        created_apps = 0
        photos_added = 0

        self.stdout.write(
            f"Seeding {count} demo sellers ({listings_per_seller} approved listing(s) each, fast={fast})..."
        )
        if fast:
            self.stdout.write("Preparing category photo pools (property, vehicles, jobs, etc.)…")
            for cat in CATEGORY_PICSUM_SEEDS:
                _category_photo_pool(cat)
            self.stdout.write(f"Photo pools ready ({len(_CATEGORY_PHOTO_CACHE)} categories).")

        for idx in range(count):
            seller_data = _seller_profile(idx)
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
                if not fast or idx < 3 or (idx + 1) % 250 == 0:
                    self.stdout.write(f"[+] Seller {idx + 1}/{count}: {user.full_name}")
            elif not fast or (idx + 1) % 250 == 0:
                self.stdout.write(f"[=] Seller {idx + 1}/{count}: {user.full_name} (exists)")

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
                    if not fast:
                        app.nagrita.save(f"nagrita_{user.id}.jpg", _demo_jpeg("nagrita_demo.jpg", 0), save=False)
                        app.photo.save(f"photo_{user.id}.jpg", _demo_jpeg("photo_demo.jpg", 1), save=False)
                    app.save()
                    created_apps += 1
                except Exception as exc:
                    if not fast:
                        self.stdout.write(
                            self.style.WARNING(f"  [!] Verified app skipped for {user.full_name}: {exc}")
                        )

            SellerWallet.objects.get_or_create(
                provider=user,
                defaults={"balance_paisa": random.randint(800000, 3500000)},
            )

            listing_rows = _pick_listings(idx, listings_per_seller)
            for listing_index, listing_data in enumerate(listing_rows):
                lat, lng = _coords_for_city(listing_data["city"])
                listing, created = Listing.objects.get_or_create(
                    owner=user,
                    title=listing_data["title"],
                    defaults={
                        "category": listing_data["category"],
                        "subcategory": listing_data["subcategory"],
                        "description": listing_data["description"],
                        "price": str(listing_data["price"]),
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
                        "view_count": random.randint(25, 850),
                        "extras": {"dealType": listing_data["subcategory"], "demo_seed": True},
                    },
                )
                if not created and (listing.lat is None or listing.lng is None):
                    listing.lat = lat
                    listing.lng = lng
                    listing.save(update_fields=["lat", "lng", "updated_at"])
                if created:
                    created_listings += 1
                try:
                    if fast:
                        photo_count = _photo_count_for_listing(idx, listing_index)
                        added = _attach_photos_from_pool(
                            listing,
                            photo_count,
                            refresh=refresh_photos,
                        )
                    else:
                        added = _attach_listing_photos(listing, refresh=refresh_photos)
                    if added:
                        photos_added += added
                except Exception as photo_exc:
                    if not fast:
                        self.stdout.write(
                            self.style.WARNING(f"  [!] Photos skipped for {listing.title}: {photo_exc}")
                        )

            if fast and (idx + 1) % 250 == 0:
                self.stdout.write(f"… {idx + 1}/{count} sellers processed")

        backfilled = _backfill_missing_demo_photos()
        if backfilled:
            photos_added += backfilled
            self.stdout.write(f"Backfilled photos on {backfilled} demo listings that had none.")

        demo_phones = [f"+{PHONE_BASE + i}" for i in range(count)]
        for listing in Listing.objects.filter(owner__phone__in=demo_phones, lat__isnull=True):
            lat, lng = _coords_for_city(listing.city or "Kathmandu")
            listing.lat = lat
            listing.lng = lng
            listing.save(update_fields=["lat", "lng", "updated_at"])

        total_sellers = AppUser.objects.filter(
            account_type=AppUser.ACCOUNT_PROVIDER,
            phone__in=demo_phones,
        ).count()
        total_listings = Listing.objects.filter(
            owner__phone__in=demo_phones,
            status=Listing.STATUS_APPROVED,
        ).count()
        multi_photo_listings = (
            Listing.objects.filter(owner__phone__in=demo_phones)
            .annotate(photo_total=models.Count("photos"))
            .filter(photo_total__gte=3)
            .count()
        )

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Demo seed complete"))
        self.stdout.write(f"  New sellers this run: {created_users}")
        self.stdout.write(f"  New verified apps: {created_apps}")
        self.stdout.write(f"  New listings this run: {created_listings}")
        self.stdout.write(f"  Photos added this run: {photos_added}")
        self.stdout.write(f"  Total demo sellers in DB: {total_sellers}")
        self.stdout.write(f"  Total approved demo listings in DB: {total_listings}")
        self.stdout.write(f"  Listings with 3+ photos: {multi_photo_listings}")
        self.stdout.write("\nSample login:")
        self.stdout.write(f"  Phone: +{PHONE_BASE}")
        self.stdout.write(f"  Password: {password}")
        self.stdout.write("\nCleanup:")
        self.stdout.write("  python manage.py purge_demo_sellers")
