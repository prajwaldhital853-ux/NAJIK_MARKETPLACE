import uuid

from django.conf import settings
from django.db import models


class OneTimePassword(models.Model):
    PURPOSE_PHONE = "phone"
    PURPOSE_EMAIL = "email"
    PURPOSE_CHOICES = (
        (PURPOSE_PHONE, "Phone"),
        (PURPOSE_EMAIL, "Email"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identifier = models.CharField(max_length=150)
    purpose = models.CharField(max_length=8, choices=PURPOSE_CHOICES)
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["identifier", "purpose"]),
        ]


class LoginLockout(models.Model):
    identifier = models.CharField(max_length=150, unique=True)
    fail_count = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_failed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.identifier


class PasswordResetToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="password_resets")
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
