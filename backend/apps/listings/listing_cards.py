"""Lightweight listing rows for feeds and staff tables."""

from django.core.cache import cache
from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone

from apps.listings.models import Listing, ListingSave

FEED_CACHE_VERSION_KEY = "listing_feed_v"


def listing_card_queryset(user=None):
    qs = (
        Listing.objects.select_related("owner", "owner__provider_application")
        .prefetch_related("photos")
        .annotate(
            _save_count=Count("saves", distinct=True),
            _comment_count=Count("comments", filter=Q(comments__is_hidden=False), distinct=True),
        )
    )
    if user and getattr(user, "is_authenticated", False) and hasattr(user, "account_type"):
        qs = qs.annotate(
            _saved_by_me=Exists(ListingSave.objects.filter(listing_id=OuterRef("pk"), user_id=user.id)),
        )
    return qs


def boosted_listing_ids(listing_ids):
    from apps.promotions.models import BoostCampaign

    if not listing_ids:
        return set()
    return set(
        BoostCampaign.objects.filter(
            listing_id__in=listing_ids,
            status=BoostCampaign.STATUS_ACTIVE,
            ends_at__gt=timezone.now(),
        ).values_list("listing_id", flat=True)
    )


def paused_boost_listing_ids(listing_ids):
    from apps.promotions.models import BoostCampaign

    if not listing_ids:
        return set()
    return set(
        BoostCampaign.objects.filter(
            listing_id__in=listing_ids,
            status=BoostCampaign.STATUS_PAUSED,
        ).values_list("listing_id", flat=True)
    )


def compact_listing_context(request, listings):
    ids = [row.id for row in listings]
    return {
        "request": request,
        "compact": True,
        "boosted_ids": boosted_listing_ids(ids),
        "paused_ids": paused_boost_listing_ids(ids),
    }


def parse_page(request, default_size=25, max_size=50):
    try:
        page = max(1, int(request.query_params.get("page") or 1))
        page_size = min(max(int(request.query_params.get("page_size") or default_size), 1), max_size)
    except (TypeError, ValueError):
        page, page_size = 1, default_size
    return page, page_size


def paginate_queryset(qs, page, page_size):
    start = (page - 1) * page_size
    total = qs.count()
    items = list(qs[start : start + page_size])
    return items, {
        "page": page,
        "page_size": page_size,
        "count": total,
        "has_next": start + page_size < total,
    }


def listing_counts(qs):
    rows = qs.values("category").annotate(n=Count("id"))
    by_category = {row["category"]: row["n"] for row in rows}
    by_status = {row["status"]: row["n"] for row in qs.values("status").annotate(n=Count("id"))}
    return {
        "total": sum(by_category.values()),
        "pending": by_status.get(Listing.STATUS_PENDING, 0),
        "approved": by_status.get(Listing.STATUS_APPROVED, 0),
        "rejected": by_status.get(Listing.STATUS_REJECTED, 0),
        "deactivated": by_status.get(Listing.STATUS_DEACTIVATED, 0),
        "by_category": by_category,
    }


def sync_listing_search_index(listing) -> None:
    try:
        from apps.listings.elasticsearch import delete_listing_index, index_listing
        from apps.listings.models import Listing

        if listing.status == Listing.STATUS_APPROVED:
            index_listing(listing)
        else:
            delete_listing_index(listing.id)
    except Exception:
        pass


def bump_listing_feed_cache():
    try:
        cache.incr(FEED_CACHE_VERSION_KEY)
    except ValueError:
        cache.set(FEED_CACHE_VERSION_KEY, 1, None)
    try:
        from apps.core.realtime import publish_event

        publish_event("listings_changed")
    except Exception:
        pass


def listing_feed_cache_key(query_string: str) -> str:
    version = cache.get(FEED_CACHE_VERSION_KEY) or 0
    return f"listing_feed:{version}:{query_string}"


def paginate_feed_with_boost(items, single_cat: str | None, page: int, page_size: int, sort: str = "new"):
    """
    Inject boosted listings on page 1 only, then paginate organic rows with SQL LIMIT/OFFSET.
    Never materializes the full queryset.
    Returns (listings, impression_ids, has_next).
    """
    start = (page - 1) * page_size
    if sort not in ("new", "popular"):
        chunk = items[start : start + page_size]
        return list(chunk), [], items[start + page_size : start + page_size + 1].exists()

    from apps.promotions.boost_service import (
        expire_campaigns,
        get_all_boosted_listings,
        get_boosted_listings_for_category,
    )
    from apps.promotions.models import BoostPricing

    expire_campaigns()
    pricing = BoostPricing.get_solo()
    if not pricing.is_active:
        chunk = items[start : start + page_size]
        return list(chunk), [], items[start + page_size : start + page_size + 1].exists()

    if single_cat:
        slot_limit = pricing.max_slots_per_category_feed
        boosted_ids = get_boosted_listings_for_category(single_cat, limit=slot_limit)
    else:
        slot_limit = pricing.max_active_boosts_platform
        boosted_ids = get_all_boosted_listings(limit=slot_limit)

    organic_qs = items.exclude(id__in=boosted_ids) if boosted_ids else items

    if page == 1 and boosted_ids:
        boosted_map = {str(lid): idx for idx, lid in enumerate(boosted_ids)}
        boosted_qs = items.filter(id__in=boosted_ids)
        boosted_items = sorted(list(boosted_qs), key=lambda x: boosted_map.get(str(x.id), 999))
        boosted_page = boosted_items[:page_size]
        boosted_count = len(boosted_page)
        organic_needed = max(0, page_size - boosted_count)
        organic_items = list(organic_qs[:organic_needed]) if organic_needed else []
        result = boosted_page + organic_items
        impression_ids = [str(item.id) for item in boosted_page]
        organic_has_more = organic_qs[organic_needed : organic_needed + 1].exists()
        has_next = organic_has_more
        return result, impression_ids, has_next

    boosted_on_first_page = 0
    if boosted_ids:
        boosted_on_first_page = items.filter(id__in=boosted_ids).count()
        boosted_on_first_page = min(boosted_on_first_page, page_size)

    organic_skip = max(0, start - boosted_on_first_page)
    result = list(organic_qs[organic_skip : organic_skip + page_size])
    has_next = organic_qs[organic_skip + page_size : organic_skip + page_size + 1].exists()
    return result, [], has_next
