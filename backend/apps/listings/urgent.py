from django.db.models import Q


def is_sold_extras(extras: dict | None) -> bool:
    if not extras:
        return False
    sold = extras.get("sold")
    return sold is True or str(sold).lower() in {"true", "1", "yes"}


def exclude_sold_listings(queryset):
    return queryset.exclude(
        Q(extras__contains={"sold": True})
        | Q(extras__contains={"sold": "true"})
        | Q(extras__sold=True)
        | Q(extras__sold="true")
    )


def expire_urgent_listings():
    from django.utils import timezone

    from apps.listings.models import Listing

    Listing.objects.filter(is_urgent=True, urgent_ends_at__lte=timezone.now()).update(
        is_urgent=False,
        urgent_ends_at=None,
    )


def active_urgent_filter():
    from django.utils import timezone

    expire_urgent_listings()
    return Q(is_urgent=True, urgent_ends_at__gt=timezone.now())
