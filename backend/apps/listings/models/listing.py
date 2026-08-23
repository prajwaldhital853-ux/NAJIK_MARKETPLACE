import uuid

from django.conf import settings
from django.db import models


def listing_photo_path(instance, filename):
    listing_id = instance.listing_id or "tmp"
    return f"listings/{listing_id}/{filename[-50:]}"


class Listing(models.Model):
    CATEGORY_PROPERTY = "property"
    CATEGORY_VEHICLES = "vehicles"
    CATEGORY_JOBS = "jobs"
    CATEGORY_SERVICES = "services"
    CATEGORY_MARKETPLACE = "marketplace"
    CATEGORY_BUSINESS = "business"
    CATEGORY_NEARBY = "nearby"
    CATEGORY_CHOICES = (
        (CATEGORY_PROPERTY, "Property"),
        (CATEGORY_VEHICLES, "Vehicles"),
        (CATEGORY_JOBS, "Jobs"),
        (CATEGORY_SERVICES, "Services"),
        (CATEGORY_MARKETPLACE, "Marketplace"),
        (CATEGORY_BUSINESS, "Business"),
        (CATEGORY_NEARBY, "Nearby"),
    )

    STATUS_DRAFT = "draft"
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_DEACTIVATED = "deactivated"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_DEACTIVATED, "Deactivated"),
    )

    CONTACT_PHONE = "phone"
    CONTACT_CHAT = "chat"
    CONTACT_WHATSAPP = "whatsapp"
    CONTACT_BOTH = "both"
    CONTACT_CHOICES = (
        (CONTACT_PHONE, "Phone"),
        (CONTACT_CHAT, "Chat"),
        (CONTACT_WHATSAPP, "WhatsApp"),
        (CONTACT_BOTH, "Phone and chat"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listings")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    subcategory = models.CharField(max_length=40)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    price = models.CharField(max_length=40, blank=True)
    negotiable = models.BooleanField(default=False)
    location = models.CharField(max_length=160)
    city = models.CharField(max_length=80, blank=True)
    district = models.CharField(max_length=80, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=15)
    contact_email = models.EmailField(blank=True)
    contact_whatsapp = models.CharField(max_length=15, blank=True)
    contact_via = models.CharField(max_length=12, choices=CONTACT_CHOICES, default=CONTACT_PHONE)
    extras = models.JSONField(default=dict, blank=True)
    promote_requested = models.BooleanField(default=False)
    is_promoted = models.BooleanField(default=False)
    is_urgent = models.BooleanField(default=False)
    urgent_ends_at = models.DateTimeField(null=True, blank=True)
    admin_reason = models.TextField(blank=True)
    pending_edit = models.JSONField(default=dict, blank=True)
    view_count = models.PositiveIntegerField(default=0)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def has_pending_edit(self):
        return bool(self.pending_edit)


class ListingPhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="photos")
    image = models.FileField(upload_to=listing_photo_path)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_pending = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order", "id"]


class ListingComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listing_comments")
    text = models.TextField()
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ListingReview(models.Model):
    """Legacy per-listing review rows (kept for existing data)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="reviews")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listing_reviews")
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True, default="")
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=("listing", "author"), name="uniq_listing_review_author"),
        ]


class SellerReview(models.Model):
    """Buyer rates a seller (one review per buyer per seller)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_reviews_received",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_reviews_given",
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="seller_reviews_from",
    )
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True, default="")
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=("seller", "author"), name="uniq_seller_review_author"),
        ]


class ListingSave(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="saves")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_listings")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("listing", "user"), name="uniq_listing_save_user"),
        ]
