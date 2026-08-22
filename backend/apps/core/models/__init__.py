import uuid

from django.conf import settings
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


class ProviderPlan(models.Model):
    """Service provider membership yojana — fee labels only; no in-app payment gateway."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80)
    price_label = models.CharField(max_length=40, help_text="Display only, e.g. Rs. 5,000/year")
    description = models.TextField(blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.name} ({self.price_label})"


class ProviderLedgerEntry(models.Model):
    """Manual refund / promotion / plan records for providers on admin — no payment flow."""

    KIND_REFUND = "refund"
    KIND_PROMOTION = "promotion"
    KIND_PLAN = "plan"
    KIND_OTHER = "other"
    KIND_CHOICES = (
        (KIND_REFUND, "Refund"),
        (KIND_PROMOTION, "Listing promotion"),
        (KIND_PLAN, "Plan / yojana"),
        (KIND_OTHER, "Other"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )
    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default=KIND_OTHER)
    title = models.CharField(max_length=120)
    amount_label = models.CharField(max_length=40, blank=True, default="")
    note = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "staff.StaffUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ledger_entries_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.provider_id})"


from apps.core.models.seller_wallet import (
    SellerLoadRequest,
    SellerPaymentConfig,
    SellerWallet,
    SellerWalletTransaction,
)
