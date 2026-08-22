import re
import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction


class ReferEarnConfig(models.Model):
    """Singleton refer-and-earn program settings (no in-app payment)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    reward_amount = models.PositiveIntegerField(default=200)
    reward_label = models.CharField(max_length=40, default="Rs. 200")
    description = models.TextField(
        default="Share your code with friends. You earn Rs. 200 when they register as a service provider and publish their first live listing. Reward is tracked on-system; payout is offline.",
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "refer & earn config"
        verbose_name_plural = "refer & earn config"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Referral(models.Model):
    STATUS_JOINED = "joined"
    STATUS_EARNED = "earned"
    STATUS_CHOICES = (
        (STATUS_JOINED, "Joined"),
        (STATUS_EARNED, "Earned"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referrals_sent",
    )
    referred = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_received",
    )
    invite_code = models.CharField(max_length=32, db_index=True)
    referred_phone = models.CharField(max_length=15, db_index=True)
    referred_email = models.EmailField(blank=True, default="")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_JOINED)
    reward_amount = models.PositiveIntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)
    earned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-joined_at"]

    def __str__(self):
        return f"{self.referrer_id} → {self.referred_id} ({self.status})"


class ReferralConsumedIdentity(models.Model):
    """Phone/email that already used an invite — survives account deletion."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=15, unique=True, db_index=True)
    email = models.EmailField(unique=True, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.phone


def _code_slug(name: str) -> str:
    parts = re.sub(r"[^A-Za-z0-9 ]", "", (name or "").strip()).upper().split()
    base = (parts[0] if parts else "NAJIK")[:10]
    return base or "NAJIK"


def _normalize_invite_code(raw: str) -> str:
    return (raw or "").strip().upper()


def _referrer_is_eligible(referrer) -> bool:
    from apps.accounts.models import AppUser

    if referrer.account_type != AppUser.ACCOUNT_PROVIDER:
        return False
    if not referrer.is_active or referrer.account_status != AppUser.STATUS_ACTIVE:
        return False
    try:
        app = referrer.provider_application
    except Exception:
        return False
    from apps.verification.models import ProviderApplication

    return app.status == ProviderApplication.STATUS_VERIFIED


def lookup_referrer(raw_code: str):
    """Return active verified referrer for code, or None if code blank/invalid."""
    from apps.accounts.models import AppUser

    code = _normalize_invite_code(raw_code)
    if not code:
        return None
    cfg = ReferEarnConfig.get_solo()
    if not cfg.is_active:
        return None
    referrer = AppUser.objects.filter(referral_code__iexact=code, account_type=AppUser.ACCOUNT_PROVIDER).first()
    if not referrer or not _referrer_is_eligible(referrer):
        return None
    return referrer


def validate_invite_code_for_registration(raw_code: str, phone: str, email: str) -> str | None:
    """Raise ValidationError if code is present but not usable."""
    code = _normalize_invite_code(raw_code)
    if not code:
        return None
    cfg = ReferEarnConfig.get_solo()
    if not cfg.is_active:
        raise ValidationError("Refer & Earn is paused right now.")
    referrer = lookup_referrer(code)
    if not referrer:
        raise ValidationError("This invite code is not valid.")
    phone = (phone or "").strip()
    email = (email or "").lower().strip()
    if ReferralConsumedIdentity.objects.filter(phone=phone).exists():
        raise ValidationError("This phone number already used an invite code.")
    if email and ReferralConsumedIdentity.objects.filter(email__iexact=email).exists():
        raise ValidationError("This email already used an invite code.")
    if referrer.phone and phone and referrer.phone == phone:
        raise ValidationError("You cannot use your own invite code.")
    if referrer.email and email and referrer.email.lower() == email.lower():
        raise ValidationError("You cannot use your own invite code.")
    return code


def generate_referral_code(user) -> str:
    from apps.accounts.models import AppUser

    if user.referral_code:
        return user.referral_code
    base = _code_slug(user.full_name)
    for attempt in range(20):
        suffix = "" if attempt == 0 else str(secrets.randbelow(90) + 10)
        code = f"NAJIK-{base}{suffix}"
        if not AppUser.objects.filter(referral_code=code).exclude(pk=user.pk).exists():
            user.referral_code = code
            user.save(update_fields=["referral_code"])
            return code
    code = f"NAJIK-{secrets.token_hex(3).upper()}"
    user.referral_code = code
    user.save(update_fields=["referral_code"])
    return code


@transaction.atomic
def apply_referral_code(referred_user, raw_code: str):
    """Link a new provider to referrer. Returns Referral or None."""
    from apps.accounts.models import AppUser

    code = validate_invite_code_for_registration(raw_code, referred_user.phone or "", referred_user.email or "")
    if not code:
        return None
    if referred_user.account_type != AppUser.ACCOUNT_PROVIDER:
        return None
    if Referral.objects.filter(referred=referred_user).exists():
        return None
    referrer = lookup_referrer(code)
    if not referrer or referrer.pk == referred_user.pk:
        return None
    phone = (referred_user.phone or "").strip()
    email = (referred_user.email or "").lower().strip()
    cfg = ReferEarnConfig.get_solo()
    referral = Referral.objects.create(
        referrer=referrer,
        referred=referred_user,
        invite_code=code,
        referred_phone=phone,
        referred_email=email,
        reward_amount=cfg.reward_amount,
    )
    ReferralConsumedIdentity.objects.create(phone=phone, email=email or None)
    return referral


@transaction.atomic
def qualify_referral_for_listing(listing):
    """Credit referrer when referred provider's first real live listing goes up."""
    from apps.accounts.models import AppUser
    from apps.listings.models import Listing
    from apps.listings.urgent import is_sold_extras

    owner = listing.owner
    if owner.account_type != AppUser.ACCOUNT_PROVIDER:
        return
    if listing.status != Listing.STATUS_APPROVED:
        return
    if is_sold_extras(listing.extras):
        return
    if not (listing.title or "").strip():
        return
    try:
        ref = Referral.objects.select_for_update().get(referred=owner)
    except Referral.DoesNotExist:
        return
    if ref.status == Referral.STATUS_EARNED:
        return
    if not _referrer_is_eligible(ref.referrer):
        return
    try:
        app = owner.provider_application
    except Exception:
        return
    from apps.verification.models import ProviderApplication

    if app.status != ProviderApplication.STATUS_VERIFIED:
        return
    prior = (
        Listing.objects.filter(owner=owner, status=Listing.STATUS_APPROVED)
        .exclude(pk=listing.pk)
        .exclude(extras__contains={"sold": True})
        .exclude(extras__sold=True)
        .count()
    )
    if prior > 0:
        return
    from django.utils import timezone

    ref.status = Referral.STATUS_EARNED
    ref.earned_at = timezone.now()
    ref.save(update_fields=["status", "earned_at"])
