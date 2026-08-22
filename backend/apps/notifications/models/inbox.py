import uuid

from django.conf import settings
from django.db import models


class InboxNotice(models.Model):
    KIND_BOOKING = "booking"
    KIND_MESSAGE = "message"
    KIND_LISTING = "listing"
    KIND_OTHER = "other"
    KIND_CHOICES = (
        (KIND_BOOKING, "Booking"),
        (KIND_MESSAGE, "Message"),
        (KIND_LISTING, "Listing"),
        (KIND_OTHER, "Other"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="inbox_notices")
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default=KIND_OTHER)
    target = models.CharField(max_length=24, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
