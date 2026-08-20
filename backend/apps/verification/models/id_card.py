import secrets
import uuid
from datetime import datetime

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class ProviderIdCard(models.Model):
    """Auto-issued seller ID card. Download/print stay blocked until staff approves."""

    ACCESS_BLOCKED = "blocked"
    ACCESS_REQUESTED = "requested"
    ACCESS_APPROVED = "approved"
    ACCESS_CHOICES = (
        (ACCESS_BLOCKED, "Blocked"),
        (ACCESS_REQUESTED, "Download requested"),
        (ACCESS_APPROVED, "Download approved"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="id_card",
    )
    card_code = models.CharField(max_length=40, unique=True, db_index=True)
    verify_token = models.CharField(max_length=64, unique=True, db_index=True)
    access_status = models.CharField(max_length=16, choices=ACCESS_CHOICES, default=ACCESS_BLOCKED)
    requested_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "staff.StaffUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_id_cards",
    )
    staff_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.card_code} ({self.access_status})"

    @property
    def can_download(self) -> bool:
        return self.access_status == self.ACCESS_APPROVED

    def request_download(self):
        if self.access_status == self.ACCESS_APPROVED:
            return
        self.access_status = self.ACCESS_REQUESTED
        self.requested_at = timezone.now()
        self.save(update_fields=["access_status", "requested_at", "updated_at"])

    def approve(self, staff=None, note: str = ""):
        self.access_status = self.ACCESS_APPROVED
        self.approved_at = timezone.now()
        self.approved_by = staff
        if note:
            self.staff_note = note
        self.save(update_fields=["access_status", "approved_at", "approved_by", "staff_note", "updated_at"])

    def revoke(self, note: str = ""):
        self.access_status = self.ACCESS_BLOCKED
        self.approved_at = None
        self.approved_by = None
        if note:
            self.staff_note = note
        self.save(update_fields=["access_status", "approved_at", "approved_by", "staff_note", "updated_at"])


def _next_card_code() -> str:
    year = datetime.now().year
    prefix = f"NAJIK-SP-{year}-"
    with transaction.atomic():
        last = (
            ProviderIdCard.objects.select_for_update()
            .filter(card_code__startswith=prefix)
            .order_by("-card_code")
            .first()
        )
        seq = 1
        if last:
            try:
                seq = int(last.card_code.rsplit("-", 1)[-1]) + 1
            except ValueError:
                seq = ProviderIdCard.objects.filter(card_code__startswith=prefix).count() + 1
        return f"{prefix}{seq:05d}"


def ensure_provider_id_card(user) -> ProviderIdCard:
    """Create a unique ID card for a provider account if missing."""
    if getattr(user, "account_type", None) != "provider":
        raise ValueError("ID cards are only for service providers")
    existing = ProviderIdCard.objects.filter(owner=user).first()
    if existing:
        return existing
    for _ in range(5):
        try:
            return ProviderIdCard.objects.create(
                owner=user,
                card_code=_next_card_code(),
                verify_token=secrets.token_urlsafe(24),
            )
        except Exception:
            continue
    raise RuntimeError("Could not allocate provider ID card")
