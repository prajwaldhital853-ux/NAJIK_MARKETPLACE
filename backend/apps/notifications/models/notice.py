import uuid

from django.db import models


def notice_image_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"notices/{instance.id}/image.{ext}"


class AppNotice(models.Model):
    AUDIENCE_ALL = "all"
    AUDIENCE_BUYER = "buyer"
    AUDIENCE_PROVIDER = "provider"
    AUDIENCE_CHOICES = (
        (AUDIENCE_ALL, "All users"),
        (AUDIENCE_BUYER, "Buyers only"),
        (AUDIENCE_PROVIDER, "Sellers only"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True, default="")
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default=AUDIENCE_ALL)
    image = models.ImageField(upload_to=notice_image_path, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.audience})"

    def matches_account(self, account_type: str | None) -> bool:
        if self.audience == self.AUDIENCE_ALL:
            return True
        if self.audience == self.AUDIENCE_BUYER:
            return account_type == "user"
        if self.audience == self.AUDIENCE_PROVIDER:
            return account_type == "provider"
        return False
