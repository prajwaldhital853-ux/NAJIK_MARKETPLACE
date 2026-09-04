import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


def chat_image_path(instance, filename):
    return f"chat/{instance.thread_id}/{filename[-50:]}"


def chat_voice_path(instance, filename):
    return f"chat/{instance.thread_id}/voice_{filename[-50:]}"


def voice_file_storage():
    """Cloudinary image storage rejects .m4a; use raw storage for voice notes."""
    if getattr(settings, "CLOUDINARY_URL", ""):
        try:
            from cloudinary_storage.storage import RawMediaCloudinaryStorage

            return RawMediaCloudinaryStorage()
        except Exception:
            pass
    from django.core.files.storage import default_storage

    return default_storage


class ChatThread(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_threads",
    )
    listing_title = models.CharField(max_length=160)
    listing_price = models.CharField(max_length=40, blank=True)
    listing_location = models.CharField(max_length=160, blank=True)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="buyer_chats")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_chats")
    buyer_viewing_at = models.DateTimeField(null=True, blank=True)
    seller_viewing_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("listing", "buyer"),
                condition=Q(listing__isnull=False),
                name="chat_thread_listing_buyer_unique",
            ),
        ]
        ordering = ("-updated_at",)

    def other_user(self, user):
        return self.seller if user.id == self.buyer_id else self.buyer

    def is_participant(self, user):
        return user.id in (self.buyer_id, self.seller_id)


class ChatMessage(models.Model):
    KIND_TEXT = "text"
    KIND_IMAGE = "image"
    KIND_VOICE = "voice"
    KIND_LOCATION = "location"
    KIND_BOOKING = "booking"
    KIND_CHOICES = (
        (KIND_TEXT, "Text"),
        (KIND_IMAGE, "Image"),
        (KIND_VOICE, "Voice"),
        (KIND_LOCATION, "Location"),
        (KIND_BOOKING, "Booking"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    kind = models.CharField(max_length=12, choices=KIND_CHOICES, default=KIND_TEXT)
    text = models.TextField(blank=True)
    image = models.FileField(upload_to=chat_image_path, blank=True)
    voice = models.FileField(upload_to=chat_voice_path, blank=True, storage=voice_file_storage)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    location_label = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("created_at",)


class ChatBlock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_blocks_made")
    blocked = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_blocks_received")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("blocker", "blocked"), name="chat_block_unique")]


class ChatReport(models.Model):
    STATUS_OPEN = "open"
    STATUS_REVIEW = "under_review"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_REVIEW, "Under review"),
        (STATUS_RESOLVED, "Resolved"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_reports_made")
    accused = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_reports_against")
    reason = models.TextField()
    transcript = models.JSONField(default=list, blank=True)
    listing_snapshot = models.JSONField(default=dict, blank=True)
    reporter_snapshot = models.JSONField(default=dict, blank=True)
    accused_snapshot = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
