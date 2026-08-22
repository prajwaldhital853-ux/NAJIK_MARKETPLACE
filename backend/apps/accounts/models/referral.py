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
        default=(
            "Each invite code works for one friend only. Share your code — when they register as a "
            "verified seller and publish their first live listing, you get the reward in Payments. "
            "A new code is generated after each successful invite."
        ),
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


def _new_random_invite_code() -> str:
    """Hard-to-guess single-use invite code."""
    return f"NAJIK-{secrets.token_hex(2).upper()}-{secrets.token_hex(3).upper()}"


def _code_was_consumed(code: str) -> bool:
    return Referral.objects.filter(invite_code__iexact=code).exists()


def lookup_referrer(raw_code: str):
    """Return active verified referrer for the user's current code, or None."""
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
        if _code_was_consumed(code):
            raise ValidationError(
                "This invite code was already used. Ask your friend to open Invite & Earn and share their new code."
            )
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


def generate_referral_code(user, force_new: bool = False) -> str:
    from apps.accounts.models import AppUser

    if user.referral_code and not force_new:
        return user.referral_code
    for _ in range(40):
        code = _new_random_invite_code()
        if not AppUser.objects.filter(referral_code=code).exclude(pk=user.pk).exists():
            user.referral_code = code
            user.save(update_fields=["referral_code"])
            return code
    code = f"NAJIK-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
    user.referral_code = code
    user.save(update_fields=["referral_code"])
    return code


@transaction.atomic
def rotate_referral_code(user) -> str:
    """Invalidate the current code and issue a new one (after a successful invite)."""
    from apps.accounts.models import AppUser

    locked = AppUser.objects.select_for_update().get(pk=user.pk)
    return generate_referral_code(locked, force_new=True)


@transaction.atomic
def ensure_fresh_invite_code(user) -> str:
    """Return active code; rotate automatically if the current one was already used."""
    from apps.accounts.models import AppUser

    locked = AppUser.objects.select_for_update().get(pk=user.pk)
    if locked.referral_code and Referral.objects.filter(invite_code__iexact=locked.referral_code).exists():
        return generate_referral_code(locked, force_new=True)
    return generate_referral_code(locked)


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
    from apps.accounts.models import AppUser

    referrer = AppUser.objects.select_for_update().get(pk=referrer.pk)
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
    rotate_referral_code(referrer)
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
    prior = 0
    for row in Listing.objects.filter(owner=owner, status=Listing.STATUS_APPROVED).exclude(pk=listing.pk):
        if is_sold_extras(row.extras):
            continue
        if not (row.title or "").strip():
            continue
        prior += 1
    if prior > 0:
        return
    from django.utils import timezone

    ref.status = Referral.STATUS_EARNED
    ref.earned_at = timezone.now()
    ref.save(update_fields=["status", "earned_at"])
    from apps.core.seller_wallet_service import credit_referral_reward

    credit_referral_reward(ref)


def _first_qualifying_listing_for_referred(referred):
    from apps.listings.models import Listing
    from apps.listings.urgent import is_sold_extras

    for row in Listing.objects.filter(owner=referred, status=Listing.STATUS_APPROVED).order_by("created_at", "pk"):
        if is_sold_extras(row.extras):
            continue
        if not (row.title or "").strip():
            continue
        return row
    return None


def referral_status_detail(row: Referral) -> str:
    if row.status == Referral.STATUS_EARNED:
        return f"Rs. {row.reward_amount} was added to your Payments balance."
    cfg = ReferEarnConfig.get_solo()
    referred = row.referred
    try:
        app = referred.provider_application
    except Exception:
        return "Friend joined — waiting for them to complete seller registration."
    from apps.verification.models import ProviderApplication

    if app.status != ProviderApplication.STATUS_VERIFIED:
        return "Friend joined — reward pending until NAJIK verifies their seller account."
    if _first_qualifying_listing_for_referred(referred):
        return "Friend has a live listing — syncing your reward. Pull to refresh."
    return (
        f"Friend joined — you earn {cfg.reward_label} when they publish their first live listing "
        "(not draft). Reward goes to Payments."
    )


def sync_joined_referral_earnings(referrer=None):
    """Backfill earned status + wallet credit when a referred user already has a qualifying listing."""
    qs = Referral.objects.filter(status=Referral.STATUS_JOINED).select_related("referred", "referrer")
    if referrer is not None:
        qs = qs.filter(referrer=referrer)
    for ref in qs:
        listing = _first_qualifying_listing_for_referred(ref.referred)
        if listing:
            qualify_referral_for_listing(listing)
