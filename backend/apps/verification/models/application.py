import uuid

from django.conf import settings
from django.db import models


def nagrita_path(instance, filename):
    return f"kyc/{instance.owner_id}/nagrita_{filename[-40:]}"


def nagrita_back_path(instance, filename):
    return f"kyc/{instance.owner_id}/nagrita_back_{filename[-40:]}"


def photo_path(instance, filename):
    return f"kyc/{instance.owner_id}/photo_{filename[-40:]}"


class ProviderApplication(models.Model):
    STATUS_PENDING = "pending"
    STATUS_VERIFIED = "verified"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_VERIFIED, "Verified"),
        (STATUS_REJECTED, "Rejected"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_application",
    )
    full_name = models.CharField(max_length=150)
    address = models.CharField(max_length=255)
    contact = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    service_type = models.CharField(max_length=40)
    nagrita = models.FileField(upload_to=nagrita_path)
    nagrita_back = models.FileField(upload_to=nagrita_back_path, blank=True)
    photo = models.FileField(upload_to=photo_path)
    pending_edit = models.JSONField(default=dict, blank=True)
    pending_nagrita = models.FileField(upload_to=nagrita_path, blank=True)
    pending_nagrita_back = models.FileField(upload_to=nagrita_back_path, blank=True)
    pending_photo = models.FileField(upload_to=photo_path, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def has_pending_profile_edit(self):
        return bool(self.pending_edit) or bool(self.pending_nagrita) or bool(self.pending_nagrita_back) or bool(self.pending_photo)

    def __str__(self):
        return f"{self.full_name} ({self.status})"
