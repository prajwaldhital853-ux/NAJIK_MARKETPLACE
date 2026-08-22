import uuid

from django.conf import settings
from django.db import models


class Booking(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey("listings.Listing", on_delete=models.CASCADE, related_name="bookings")
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings_sent")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings_received")
    thread = models.ForeignKey("chat.ChatThread", on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    scheduled_at = models.DateTimeField()
    location = models.CharField(max_length=200)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    item = models.CharField(max_length=160, blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=15, blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def other_user(self, user):
        return self.recipient if user.id == self.requester_id else self.requester

    def is_party(self, user):
        return user.id in (self.requester_id, self.recipient_id)
