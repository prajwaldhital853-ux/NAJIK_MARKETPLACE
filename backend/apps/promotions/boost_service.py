"""Boost campaign wallet operations and rotation logic."""

import logging
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.core.models import SellerWallet, SellerWalletTransaction
from apps.promotions.models import BoostCampaign, BoostPricing

logger = logging.getLogger(__name__)


class InsufficientBalanceError(ValidationError):
    pass


class BoostLimitReachedError(ValidationError):
    pass


def rupees_to_paisa(rupees: int) -> int:
    return int(rupees) * 100


def paisa_to_label(paisa: int) -> str:
    return f"Rs. {paisa // 100:,}"


def get_or_create_wallet(provider) -> SellerWallet:
    wallet, _ = SellerWallet.objects.get_or_create(provider=provider)
    return wallet


def _active_campaign_qs():
    now = timezone.now()
    return BoostCampaign.objects.filter(
        status=BoostCampaign.STATUS_ACTIVE,
        starts_at__lte=now,
        ends_at__gt=now,
    )


def sync_listing_promoted_flag(listing_id):
    """Keep listing.is_promoted aligned with wallet boost campaigns."""
    from apps.listings.models import Listing

    listing = Listing.objects.filter(pk=listing_id).first()
    if not listing:
        return
    boosted = _active_campaign_qs().filter(listing_id=listing_id).exists()
    if listing.is_promoted != boosted:
        listing.is_promoted = boosted
        listing.save(update_fields=["is_promoted", "updated_at"])


def record_boost_inquiry_for_listing(listing_id, sender=None):
    """Count inquiry when a buyer messages or books on a boosted listing."""
    if not listing_id:
        return
    from apps.listings.models import Listing

    listing = Listing.objects.filter(pk=listing_id).only("owner_id").first()
    if not listing:
        return
    if sender is not None and getattr(sender, "id", None) == listing.owner_id:
        return
    campaign = (
        _active_campaign_qs()
        .filter(listing_id=listing_id)
        .order_by("-created_at")
        .first()
    )
    if campaign:
        record_boost_inquiry(campaign)


@transaction.atomic
def create_boost_campaign(seller, listing, duration_days: int) -> BoostCampaign:
    """
    Deduct wallet balance and create boost campaign.
    Raises InsufficientBalanceError or BoostLimitReachedError.
    """
    pricing = BoostPricing.get_solo()
    
    if not pricing.is_active:
        raise ValidationError("Boost promotions are currently disabled.")
    
    # Check limits
    active_seller_boosts = BoostCampaign.objects.filter(
        seller=seller,
        status=BoostCampaign.STATUS_ACTIVE,
        ends_at__gt=timezone.now(),
    ).count()
    
    if active_seller_boosts >= pricing.max_active_boosts_per_seller:
        raise BoostLimitReachedError(
            f"Maximum {pricing.max_active_boosts_per_seller} active boosts per seller."
        )
    
    active_category_boosts = BoostCampaign.objects.filter(
        category=listing.category,
        status=BoostCampaign.STATUS_ACTIVE,
        ends_at__gt=timezone.now(),
    ).count()
    
    if active_category_boosts >= pricing.max_active_boosts_per_category:
        raise BoostLimitReachedError(
            f"Category {listing.category} boost queue is full. Try again later."
        )
    
    active_platform_boosts = BoostCampaign.objects.filter(
        status=BoostCampaign.STATUS_ACTIVE,
        ends_at__gt=timezone.now(),
    ).count()
    
    if active_platform_boosts >= pricing.max_active_boosts_platform:
        raise BoostLimitReachedError(
            "Platform boost capacity reached. Try again later."
        )
    
    # Calculate price
    price_rupees = pricing.get_price_for_duration(duration_days)
    price_paisa = rupees_to_paisa(price_rupees)
    
    # Check wallet balance
    wallet = SellerWallet.objects.select_for_update().get_or_create(provider=seller)[0]
    if wallet.balance_paisa < price_paisa:
        raise InsufficientBalanceError(
            f"Insufficient balance. Need {paisa_to_label(price_paisa)}, have {paisa_to_label(wallet.balance_paisa)}."
        )
    
    # Deduct wallet
    wallet.balance_paisa -= price_paisa
    wallet.save(update_fields=["balance_paisa", "updated_at"])
    
    # Create campaign
    now = timezone.now()
    campaign = BoostCampaign.objects.create(
        listing=listing,
        seller=seller,
        status=BoostCampaign.STATUS_ACTIVE,
        duration_days=duration_days,
        price_paid_paisa=price_paisa,
        starts_at=now,
        ends_at=now + timedelta(days=duration_days),
        category=listing.category,
        current_slot=0,
        last_rotation_at=now,
    )
    
    # Record transaction
    SellerWalletTransaction.objects.create(
        wallet=wallet,
        kind=SellerWalletTransaction.KIND_BOOST_FEE,
        amount_paisa=-price_paisa,
        balance_after_paisa=wallet.balance_paisa,
        listing=listing,
        boost_campaign=campaign,
        note=f"{duration_days}-day boost for \"{listing.title or 'listing'}\"",
    )

    listing.is_promoted = True
    listing.save(update_fields=["is_promoted", "updated_at"])

    try:
        from apps.notifications.models.inbox import InboxNotice
        from apps.notifications.services import notify_user

        notify_user(
            seller,
            "Listing boosted",
            f"“{listing.title}” is promoted for {duration_days} days. Cost: {paisa_to_label(price_paisa)}.",
            kind=InboxNotice.KIND_OTHER,
            target="promotions",
            target_id=str(campaign.id),
            sender_name="NAJIK Promotions",
        )
    except Exception:
        pass

    logger.info(
        "boost created: seller=%s listing=%s days=%d price=%s",
        seller.id,
        listing.id,
        duration_days,
        paisa_to_label(price_paisa),
    )

    return campaign


def expire_campaigns():
    """Mark expired campaigns as expired."""
    now = timezone.now()
    expired_ids = list(
        BoostCampaign.objects.filter(
            status=BoostCampaign.STATUS_ACTIVE,
            ends_at__lte=now,
        ).values_list("listing_id", flat=True)
    )
    expired_count = len(expired_ids)
    if expired_count:
        BoostCampaign.objects.filter(
            status=BoostCampaign.STATUS_ACTIVE,
            ends_at__lte=now,
        ).update(status=BoostCampaign.STATUS_EXPIRED)
        for listing_id in set(expired_ids):
            sync_listing_promoted_flag(listing_id)
        logger.info("expired %d boost campaigns", expired_count)


def rotate_campaign_slots():
    """
    Rotate boost slots within categories every N minutes.
    Fair rotation: each campaign gets time in every slot position.
    """
    pricing = BoostPricing.get_solo()
    rotation_interval = timedelta(minutes=pricing.rotation_interval_minutes)
    cutoff = timezone.now() - rotation_interval
    
    categories = (
        BoostCampaign.objects.filter(
            status=BoostCampaign.STATUS_ACTIVE,
            ends_at__gt=timezone.now(),
            last_rotation_at__lte=cutoff,
        )
        .values_list("category", flat=True)
        .distinct()
    )
    
    for category in categories:
        active_campaigns = list(
            BoostCampaign.objects.filter(
                category=category,
                status=BoostCampaign.STATUS_ACTIVE,
                ends_at__gt=timezone.now(),
            ).order_by("current_slot", "total_rotations", "-duration_days")
        )
        
        if not active_campaigns:
            continue
        
        # Rotate: increment slot, wrap around
        for campaign in active_campaigns:
            campaign.current_slot = (campaign.current_slot + 1) % len(active_campaigns)
            campaign.total_rotations += 1
            campaign.last_rotation_at = timezone.now()
        
        BoostCampaign.objects.bulk_update(
            active_campaigns,
            ["current_slot", "total_rotations", "last_rotation_at"],
        )
        
        logger.info("rotated %d boost slots in category %s", len(active_campaigns), category)


def get_boosted_listings_for_category(category: str, limit: int = 5) -> list:
    """
    Returns active boosted listing IDs in display order for a category.
    Uses rotation slot + priority score.
    """
    expire_campaigns()
    rotate_campaign_slots()
    
    campaigns = BoostCampaign.objects.filter(
        category=category,
        status=BoostCampaign.STATUS_ACTIVE,
        ends_at__gt=timezone.now(),
    ).select_related("listing").order_by("current_slot")
    
    # Sort by slot, then priority
    ranked = sorted(campaigns, key=lambda c: (c.current_slot, -c.calculate_priority_score()))
    
    return [c.listing_id for c in ranked[:limit]]


def record_boost_impression(campaign: BoostCampaign):
    """Track when a boosted listing appears in feed."""
    BoostCampaign.objects.filter(pk=campaign.pk).update(
        impression_count=campaign.impression_count + 1,
        last_impression_at=timezone.now(),
    )


def record_boost_impressions_for_listing_ids(listing_ids: list):
    """Batch impression bump for boosted listings shown in a feed."""
    if not listing_ids:
        return
    now = timezone.now()
    campaigns = list(
        _active_campaign_qs().filter(listing_id__in=listing_ids).only("id", "impression_count")
    )
    if not campaigns:
        return
    for campaign in campaigns:
        campaign.impression_count += 1
        campaign.last_impression_at = now
    BoostCampaign.objects.bulk_update(campaigns, ["impression_count", "last_impression_at"])


def record_boost_view(campaign: BoostCampaign):
    """Track when a boosted listing detail is viewed."""
    campaign.view_count += 1
    campaign.save(update_fields=["view_count"])


def record_boost_inquiry(campaign: BoostCampaign):
    """Track inquiries (messages, bookings) from boosted listings."""
    campaign.inquiry_count += 1
    campaign.save(update_fields=["inquiry_count"])
