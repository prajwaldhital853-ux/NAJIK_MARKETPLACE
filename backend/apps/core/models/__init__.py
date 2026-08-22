import uuid

from django.db import models


def signatory_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    return f"branding/authorized-signatory.{ext}"


class BrandingConfig(models.Model):
    """Singleton branding assets (ID card signatory, emergency contact, etc.)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    authorized_signatory = models.ImageField(upload_to=signatory_path, blank=True)
    emergency_phone = models.CharField(max_length=40, blank=True, default="01-5970123")
    emergency_email = models.EmailField(blank=True, default="support@najik.com")
    website = models.CharField(max_length=120, blank=True, default="www.najik.com")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "branding config"
        verbose_name_plural = "branding config"

    def __str__(self):
        return "Branding"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


def home_banner_path(_instance, filename):
    """Legacy upload path for migration 0003."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"app-control/home-banner.{ext}"


def home_banner_slide_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"app-control/banners/{instance.id}/image.{ext}"


class HomeBannerSlide(models.Model):
    AUDIENCE_ALL = "all"
    AUDIENCE_BUYER = "buyer"
    AUDIENCE_PROVIDER = "provider"
    AUDIENCE_CHOICES = (
        (AUDIENCE_ALL, "Buyers and sellers"),
        (AUDIENCE_BUYER, "Buyers only"),
        (AUDIENCE_PROVIDER, "Sellers only"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image = models.ImageField(upload_to=home_banner_slide_path)
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default=AUDIENCE_ALL)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return f"Home banner ({self.audience})"

    def matches_audience(self, audience: str) -> bool:
        if not self.is_active:
            return False
        if self.audience == self.AUDIENCE_ALL:
            return True
        if audience == "buyer":
            return self.audience in {self.AUDIENCE_ALL, self.AUDIENCE_BUYER}
        if audience == "provider":
            return self.audience in {self.AUDIENCE_ALL, self.AUDIENCE_PROVIDER}
        return self.audience == self.AUDIENCE_ALL
