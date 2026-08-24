import uuid

from django.conf import settings
from django.db import models


def payment_qr_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    return f"app-control/payment-qr.{ext}"


def load_proof_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"seller-loads/{instance.id}/proof.{ext}"


class SellerPaymentConfig(models.Model):
    """Singleton seller listing-fee and offline top-up instructions."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    listing_fee_rupees = models.PositiveIntegerField(default=10)
    listing_fee_label = models.CharField(max_length=40, default="Rs. 10")
    bank_name = models.CharField(max_length=120, blank=True, default="")
    bank_account_name = models.CharField(max_length=120, blank=True, default="")
    bank_account_number = models.CharField(max_length=64, blank=True, default="")
    bank_branch = models.CharField(max_length=120, blank=True, default="")
    payment_instructions = models.TextField(blank=True, default="")
    qr_code = models.ImageField(upload_to=payment_qr_path, blank=True)
    min_load_rupees = models.PositiveIntegerField(default=100)
    max_load_rupees = models.PositiveIntegerField(default=50000)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "seller payment config"
        verbose_name_plural = "seller payment config"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class SellerWallet(models.Model):
    provider = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_wallet",
    )
    balance_paisa = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"wallet:{self.provider_id} ({self.balance_paisa} paisa)"


class SellerLoadRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_load_requests",
    )
    amount_paisa = models.PositiveBigIntegerField()
    payment_reference = models.CharField(max_length=120, blank=True, default="")
    proof_image = models.ImageField(upload_to=load_proof_path, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    admin_note = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        "staff.StaffUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="seller_load_reviews",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider"],
                condition=models.Q(status="pending"),
                name="seller_one_pending_load",
            ),
        ]

    def __str__(self):
        return f"load:{self.provider_id} {self.amount_paisa} ({self.status})"


class SellerWalletTransaction(models.Model):
    KIND_LOAD = "load"
    KIND_LISTING_FEE = "listing_fee"
    KIND_BOOST_FEE = "boost_fee"
    KIND_ADMIN_CREDIT = "admin_credit"
    KIND_ADMIN_DEBIT = "admin_debit"
    KIND_REFUND = "refund"
    KIND_REFERRAL_REWARD = "referral_reward"
    KIND_CHOICES = (
        (KIND_LOAD, "Load approved"),
        (KIND_LISTING_FEE, "Listing fee"),
        (KIND_BOOST_FEE, "Boost promotion"),
        (KIND_ADMIN_CREDIT, "Admin credit"),
        (KIND_ADMIN_DEBIT, "Admin debit"),
        (KIND_REFUND, "Refund"),
        (KIND_REFERRAL_REWARD, "Refer & Earn reward"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(SellerWallet, on_delete=models.CASCADE, related_name="transactions")
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    amount_paisa = models.BigIntegerField()
    balance_after_paisa = models.BigIntegerField()
    listing = models.ForeignKey(
        "listings.Listing",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="wallet_transactions",
    )
    load_request = models.ForeignKey(
        SellerLoadRequest,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="wallet_transactions",
    )
    boost_campaign = models.ForeignKey(
        "promotions.BoostCampaign",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="wallet_transactions",
    )
    note = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "staff.StaffUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="seller_wallet_adjustments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["listing"],
                condition=models.Q(kind="listing_fee"),
                name="seller_unique_listing_fee",
            ),
        ]

    def __str__(self):
        return f"{self.kind} {self.amount_paisa}"
