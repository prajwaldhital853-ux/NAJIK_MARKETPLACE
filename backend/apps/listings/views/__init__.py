import mimetypes
import re
from math import cos, radians

from django.core.cache import cache
from django.db.models import Avg, Count, F, Prefetch, Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AppUser
from apps.accounts.authentication import AppJWTAuthentication, OptionalAppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.permissions import IsAppUser
from apps.listings.models import Listing, ListingComment, ListingPhoto, ListingReview, ListingSave, SellerReview
from apps.listings.search import listing_place_q, listing_search_q
from apps.listings.serializers import (
    ListingCommentWriteSerializer,
    ListingReviewWriteSerializer,
    ListingSerializer,
    ListingStatusSerializer,
    ListingWriteSerializer,
    apply_pending_edit,
)
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.verification.models import ProviderApplication


def seller_can_post(user) -> bool:
    return (
        user.account_type == user.ACCOUNT_PROVIDER
        and ProviderApplication.objects.filter(owner=user, status="verified").exists()
    )


def seller_publish_balance_message(user) -> str | None:
    from apps.core.seller_wallet_service import seller_publish_blocked_message

    return seller_publish_blocked_message(user)


def listing_queryset():
    return (
        Listing.objects.select_related("owner", "owner__provider_application")
        .prefetch_related(
            "photos",
            Prefetch("comments", queryset=ListingComment.objects.select_related("author")),
            Prefetch("reviews", queryset=ListingReview.objects.select_related("author")),
            "saves",
        )
    )


from apps.listings.listing_cards import (
    bump_listing_feed_cache,
    compact_listing_context,
    listing_card_queryset,
    listing_counts,
    listing_feed_cache_key,
    paginate_queryset,
    parse_page,
)
from apps.listings.urgent import active_urgent_filter, exclude_sold_listings, expire_urgent_listings, is_sold_extras


def apply_feed_boost_priority(items, single_cat: str | None, limit: int) -> tuple[list, list[str]]:
    """
    Reorder queryset results: all active boosted listings first (rotation order),
    then organic. Returns (ordered_listings, boosted_ids_in_result).
    """
    from apps.promotions.models import BoostPricing
    from apps.promotions.boost_service import (
        expire_campaigns,
        get_all_boosted_listings,
        get_boosted_listings_for_category,
    )

    expire_campaigns()
    pricing = BoostPricing.get_solo()
    if not pricing.is_active:
        sliced = list(items[:limit])
        return sliced, []

    if single_cat:
        slot_limit = pricing.max_slots_per_category_feed
        boosted_ids = get_boosted_listings_for_category(single_cat, limit=slot_limit)
    else:
        slot_limit = pricing.max_active_boosts_platform
        boosted_ids = get_all_boosted_listings(limit=slot_limit)

    if not boosted_ids:
        return list(items[:limit]), []

    boosted_qs = items.filter(id__in=boosted_ids)
    organic_qs = items.exclude(id__in=boosted_ids)
    boosted_map = {str(lid): idx for idx, lid in enumerate(boosted_ids)}
    boosted_items = sorted(list(boosted_qs), key=lambda x: boosted_map.get(str(x.id), 999))
    ordered = list(boosted_items) + list(organic_qs)
    slice_items = ordered[:limit]
    impression_ids = [str(item.id) for item in slice_items if str(item.id) in boosted_map]
    return slice_items, impression_ids


def apply_boost_priority(items, category: str | None, limit: int) -> list:
    """
    Inject boosted listings at top of results using category rotation.
    Returns list of serialized listing data with boosted items first.
    """
    from apps.promotions.boost_service import get_boosted_listings_for_category, expire_campaigns
    from apps.promotions.models import BoostPricing
    
    expire_campaigns()
    
    if not category:
        # Multi-category or no category: take from queryset without boost priority
        return items
    
    pricing = BoostPricing.get_solo()
    if not pricing.is_active:
        return items
    
    # Get boosted listing IDs for this category (already rotated and sorted)
    boosted_ids = get_boosted_listings_for_category(category, limit=pricing.max_slots_per_category_feed)
    
    if not boosted_ids:
        return items
    
    # Split: boosted items first, then organic
    boosted_qs = items.filter(id__in=boosted_ids)
    organic_qs = items.exclude(id__in=boosted_ids)
    
    # Preserve boost rotation order
    boosted_map = {str(lid): idx for idx, lid in enumerate(boosted_ids)}
    boosted_items = sorted(list(boosted_qs), key=lambda x: boosted_map.get(str(x.id), 999))
    
    return list(boosted_items) + list(organic_qs)


class ListingFeedView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        expire_urgent_listings()
        cache_key = listing_feed_cache_key(request.META.get("QUERY_STRING", ""))
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        # Pagination params
        try:
            page = max(1, int(request.query_params.get("page") or 1))
            page_size = min(max(int(request.query_params.get("page_size") or 20), 1), 50)
        except (TypeError, ValueError):
            page = 1
            page_size = 20
        
        # Legacy limit param (for backward compat)
        legacy_limit = request.query_params.get("limit")
        if legacy_limit:
            try:
                page_size = min(max(int(legacy_limit), 1), 200)
                page = 1
            except (TypeError, ValueError):
                pass
        
        items = exclude_sold_listings(listing_card_queryset().filter(status=Listing.STATUS_APPROVED))
        urgent_only = request.query_params.get("urgent") == "1"
        if urgent_only:
            items = items.filter(active_urgent_filter())
        q = (request.query_params.get("q") or "").strip()
        if q:
            items = items.filter(listing_search_q(q))
        category = request.query_params.get("category")
        if category:
            cats = [item.strip() for item in category.split(",") if item.strip()]
            if len(cats) == 1:
                items = items.filter(category=cats[0])
            elif cats:
                items = items.filter(category__in=cats)
        subcategory = (request.query_params.get("subcategory") or "").strip()
        if subcategory:
            items = items.filter(subcategory__iexact=subcategory)
        if request.query_params.get("verified") == "1":
            items = items.filter(owner__provider_application__status="verified")
        owner = (request.query_params.get("owner") or "").strip()
        if owner:
            items = items.filter(owner_id=owner)
        min_rating = request.query_params.get("min_rating")
        if min_rating:
            try:
                items = items.annotate(avg_rating=Avg("reviews__rating")).filter(avg_rating__gte=float(min_rating))
            except (TypeError, ValueError):
                pass
        place = (request.query_params.get("place") or "").strip()
        geo_q = None
        try:
            min_lat = request.query_params.get("min_lat")
            max_lat = request.query_params.get("max_lat")
            min_lng = request.query_params.get("min_lng")
            max_lng = request.query_params.get("max_lng")
            if min_lat and max_lat and min_lng and max_lng:
                geo_q = Q(
                    lat__isnull=False,
                    lng__isnull=False,
                    lat__gte=float(min_lat),
                    lat__lte=float(max_lat),
                    lng__gte=float(min_lng),
                    lng__lte=float(max_lng),
                )
            lat = request.query_params.get("lat")
            lng = request.query_params.get("lng")
            radius = request.query_params.get("radius_km")
            if lat and lng and radius:
                center_lat = float(lat)
                center_lng = float(lng)
                km = float(radius)
                dlat = km / 111.0
                dlng = km / (111.0 * max(abs(cos(radians(center_lat))), 0.2))
                geo_q = Q(
                    lat__isnull=False,
                    lng__isnull=False,
                    lat__gte=center_lat - dlat,
                    lat__lte=center_lat + dlat,
                    lng__gte=center_lng - dlng,
                    lng__lte=center_lng + dlng,
                )
        except (TypeError, ValueError):
            geo_q = None
        place_q = listing_place_q(place)
        no_coords = Q(lat__isnull=True) | Q(lng__isnull=True)
        if place and geo_q is not None:
            items = items.filter(place_q | geo_q | no_coords)
        elif place:
            items = items.filter(place_q | no_coords)
        elif geo_q is not None:
            items = items.filter(geo_q | no_coords)
        sort = request.query_params.get("sort") or "new"
        if sort == "popular":
            items = items.order_by("-view_count", "-is_promoted", "-created_at")
        elif sort == "price_asc":
            items = items.order_by("price")
        elif sort == "price_desc":
            items = items.order_by("-price")
        else:
            items = items.order_by("-created_at")
        
        # Apply boost priority
        single_cat = None
        if category:
            cats = [item.strip() for item in category.split(",") if item.strip()]
            if len(cats) == 1:
                single_cat = cats[0]
        
        # Calculate pagination indices
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # Boost priority: category-scoped or global (recommendation / home feeds)
        if sort in ("new", "popular"):
            from apps.promotions.boost_service import record_boost_impressions_for_listing_ids

            slice_items, impression_ids = apply_feed_boost_priority(items, single_cat, end_idx + 1)
            if impression_ids:
                record_boost_impressions_for_listing_ids(impression_ids)
            paginated = slice_items[start_idx:end_idx]
            has_next = len(slice_items) > end_idx
            rows = ListingSerializer(paginated, many=True, context=compact_listing_context(request, paginated)).data
        else:
            paginated = list(items[start_idx:end_idx])
            has_next = items[end_idx:end_idx+1].exists()
            rows = ListingSerializer(paginated, many=True, context=compact_listing_context(request, paginated)).data
        
        min_price = request.query_params.get("min_price")
        max_price = request.query_params.get("max_price")
        if min_price or max_price:
            lo = int(re.sub(r"\D", "", min_price or "0") or 0)
            hi = int(re.sub(r"\D", "", max_price or "0") or 0)

            def price_num(row):
                digits = re.sub(r"\D", "", str(row.get("price") or ""))
                return int(digits) if digits else 0

            rows = [row for row in rows if (not lo or price_num(row) >= lo) and (not hi or price_num(row) <= hi)]
        rows = [row for row in rows if not is_sold_extras(row.get("extras"))]
        
        # Return paginated response (backward compat: if legacy limit used, return array; else object)
        if legacy_limit:
            payload = rows
        else:
            payload = {
                "results": rows,
                "page": page,
                "page_size": page_size,
                "has_next": has_next,
            }
        cache.set(cache_key, payload, 20)
        return Response(payload)


def record_listing_view_event(listing: Listing, viewer=None) -> int:
    """Count every listing open (repeat visits by anyone except owner each count once)."""
    Listing.objects.filter(pk=listing.pk).update(view_count=F("view_count") + 1)
    listing.refresh_from_db(fields=["view_count"])

    try:
        from apps.promotions.models import BoostCampaign, BoostPricing
        from apps.promotions.boost_service import record_boost_view

        campaign = BoostCampaign.objects.filter(
            listing_id=listing.id,
            status=BoostCampaign.STATUS_ACTIVE,
            ends_at__gt=timezone.now(),
        ).first()
        if campaign:
            record_boost_view(campaign)
    except Exception:
        pass

    return listing.view_count


class ListingViewRecordView(APIView):
    """Record a listing view on every open (repeat visits count)."""

    authentication_classes = [OptionalAppJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        is_owner = bool(user and getattr(user, "id", None) == listing.owner_id)
        if listing.status != Listing.STATUS_APPROVED:
            return Response({"detail": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)
        if is_owner:
            return Response({"view_count": listing.view_count, "recorded": False})
        view_count = record_listing_view_event(listing, viewer=user)
        return Response({"view_count": view_count, "recorded": True})


class ListingPublicDetailView(APIView):
    authentication_classes = [OptionalAppJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, pk):
        listing = get_object_or_404(listing_queryset(), pk=pk)
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        is_owner = bool(user and getattr(user, "id", None) == listing.owner_id)
        if listing.status != Listing.STATUS_APPROVED and not is_owner:
            return Response({"detail": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ListingSerializer(listing, context={"request": request}).data)


class PublicSellerProfileView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request, pk):
        seller = get_object_or_404(AppUser.objects.select_related("provider_application"), pk=pk)
        app = getattr(seller, "provider_application", None)
        is_provider = seller.account_type == AppUser.ACCOUNT_PROVIDER
        photo = (app.photo if app and app.photo else None) or seller.avatar
        photo_url = request.build_absolute_uri(f"/api/listings/sellers/{seller.id}/photo/") if photo else None
        listings = []
        phone = email = address = service_type = business_name = ""
        if is_provider and app:
            phone = app.phone or seller.phone or ""
            email = app.email or seller.email or ""
            address = app.address or ""
            service_type = app.service_type or ""
            business_name = (app.full_name or "").strip()
            listings = exclude_sold_listings(
                listing_queryset().filter(owner=seller, status=Listing.STATUS_APPROVED)
            ).order_by("-created_at")[:200]
        else:
            phone = seller.phone or ""
            email = seller.email or ""
            address = seller.address or ""
        from apps.listings.serializers import merged_seller_reviews_payload

        review_payload = merged_seller_reviews_payload(seller.id, {"request": request}, limit=50)
        reviews = review_payload["reviews"]
        rating_avg = review_payload["rating_avg"]
        review_count = review_payload["review_count"]
        display_name = business_name or (app.full_name if app else "") or seller.full_name or seller.phone or "NAJIK user"
        return Response(
            {
                "id": str(seller.id),
                "full_name": display_name,
                "business_name": business_name,
                "account_type": seller.account_type,
                "phone": phone,
                "email": email,
                "address": address,
                "service_type": service_type,
                "photo_url": photo_url,
                "rating_avg": rating_avg,
                "review_count": review_count,
                "reviews": reviews,
                "listings": ListingSerializer(listings, many=True, context={"request": request}).data,
            }
        )


class PublicSellerPhotoView(APIView):
    authentication_classes = [OptionalAppJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, pk):
        seller = get_object_or_404(AppUser.objects.select_related("provider_application"), pk=pk)
        app = getattr(seller, "provider_application", None)
        file = (app.photo if app and app.photo else None) or seller.avatar
        if not file:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(file.name)
        return FileResponse(file.open("rb"), content_type=content_type or "application/octet-stream")


class ListingMineView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        # Add pagination for seller's listings
        try:
            page = max(1, int(request.query_params.get("page") or 1))
            page_size = min(max(int(request.query_params.get("page_size") or 20), 1), 50)
        except (TypeError, ValueError):
            page = 1
            page_size = 20
        
        # Legacy limit param support
        legacy_limit = request.query_params.get("limit")
        if legacy_limit:
            try:
                page_size = min(max(int(legacy_limit), 1), 200)
                page = 1
            except (TypeError, ValueError):
                pass
        
        items = listing_card_queryset(request.user).filter(owner=request.user).order_by("-created_at")
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        paginated = list(items[start_idx:end_idx])
        has_next = items[end_idx:end_idx+1].exists()
        
        serialized = ListingSerializer(paginated, many=True, context=compact_listing_context(request, paginated)).data
        
        # Return paginated response (backward compat: if legacy limit used, return array; else object)
        if legacy_limit:
            return Response(serialized)
        return Response({
            "results": serialized,
            "page": page,
            "page_size": page_size,
            "has_next": has_next,
        })

    def post(self, request):
        if not seller_can_post(request.user):
            return Response(
                {"detail": "Only verified service providers can post listings."},
                status=status.HTTP_403_FORBIDDEN,
            )
        publish = request.data.get("publish", True)
        if publish in (True, "true", "1", 1):
            blocked = seller_publish_balance_message(request.user)
            if blocked:
                return Response({"detail": blocked}, status=status.HTTP_403_FORBIDDEN)
        serializer = ListingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save(owner=request.user)
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ListingMineDetailView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def patch(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, owner=request.user)
        publish = request.data.get("publish")
        if publish in (True, "true", "1", 1) and listing.status != Listing.STATUS_APPROVED:
            blocked = seller_publish_balance_message(request.user)
            if blocked:
                return Response({"detail": blocked}, status=status.HTTP_403_FORBIDDEN)
        serializer = ListingWriteSerializer(listing, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data)

    def delete(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, owner=request.user)
        from apps.promotions.boost_service import listing_is_actively_boosted, get_live_boost_campaign

        if listing_is_actively_boosted(listing.id):
            return Response(
                {
                    "detail": "Pause the boost on this listing before deleting it. "
                    "Open Promotions → Pause boost, then delete from My Listings.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        confirmed = request.query_params.get("confirm") == "1"
        campaign = get_live_boost_campaign(listing.id)
        if campaign and campaign.status == "paused":
            days_left = campaign.days_remaining
            if days_left > 0 and not confirmed:
                return Response(
                    {
                        "detail": f"Deleting will forfeit {days_left} paid boost day{'s' if days_left != 1 else ''}. No refund is provided.",
                        "confirm_required": True,
                        "days_remaining": days_left,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        
        listing.delete()
        bump_listing_feed_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListingSoldView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, owner=request.user)
        sold = bool(request.data.get("sold"))
        extras = dict(listing.extras or {})
        extras["sold"] = sold
        listing.extras = extras
        if sold:
            listing.is_urgent = False
            listing.urgent_ends_at = None
        listing.save(update_fields=["extras", "is_urgent", "urgent_ends_at", "updated_at"])
        if sold:
            from apps.promotions.boost_service import pause_boosts_for_listing, sync_listing_promoted_flag

            pause_boosts_for_listing(listing.id, reason="Listing marked sold")
            sync_listing_promoted_flag(listing.id)
            from apps.chat.models import ChatThread
            from apps.notifications.models import InboxNotice
            from apps.notifications.services import notify_user

            saver_ids = set(listing.saves.values_list("user_id", flat=True))
            chat_ids = set(
                ChatThread.objects.filter(listing=listing).values_list("buyer_id", flat=True)
            ) | set(ChatThread.objects.filter(listing=listing).values_list("seller_id", flat=True))
            notify_ids = (saver_ids | chat_ids) - {request.user.id}
            users = AppUser.objects.filter(id__in=notify_ids)
            for user in users:
                notify_user(
                    user,
                    "Listing marked sold",
                    f"{listing.title} is no longer available.",
                    InboxNotice.KIND_LISTING,
                    "listing",
                    str(listing.id),
                    sender_name=(request.user.full_name or request.user.phone or "Seller").strip(),
                )
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data)


class ListingPhotoFileView(APIView):
    authentication_classes = [OptionalAppJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, pk, photo_id):
        photo = get_object_or_404(ListingPhoto, pk=photo_id, listing_id=pk)
        listing = photo.listing
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        is_owner = bool(user and getattr(user, "id", None) == listing.owner_id)
        if photo.is_pending and not is_owner:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if listing.status != Listing.STATUS_APPROVED and not is_owner:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(photo.image.name)
        return FileResponse(photo.image.open("rb"), content_type=content_type or "application/octet-stream")


class ListingCommentView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, status=Listing.STATUS_APPROVED)
        serializer = ListingCommentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parent = None
        parent_id = serializer.validated_data.get("parent_id")
        if parent_id:
            parent = get_object_or_404(ListingComment, pk=parent_id, listing=listing)
        ListingComment.objects.create(
            listing=listing,
            author=request.user,
            parent=parent,
            text=serializer.validated_data["text"].strip(),
        )
        listing = listing_queryset().get(pk=listing.pk)
        if listing.owner_id != request.user.id:
            from apps.notifications.services import notify_listing_activity

            author_name = (request.user.full_name or request.user.phone or "Someone").strip()
            text = serializer.validated_data["text"].strip()
            try:
                notify_listing_activity(
                    listing.owner,
                    listing,
                    f"Comment on {listing.title}",
                    text[:160],
                    sender_name=author_name,
                )
            except Exception:
                pass
        return Response(ListingSerializer(listing, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ListingReviewView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, status=Listing.STATUS_APPROVED)
        if listing.owner_id == request.user.id:
            return Response({"detail": "You cannot review your own listing."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ListingReviewWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = (serializer.validated_data.get("text") or "").strip()
        rating = serializer.validated_data["rating"]
        SellerReview.objects.update_or_create(
            seller_id=listing.owner_id,
            author=request.user,
            defaults={"rating": rating, "text": text, "listing": listing},
        )
        ListingReview.objects.update_or_create(
            listing=listing,
            author=request.user,
            defaults={"rating": rating, "text": text},
        )
        listing = listing_queryset().get(pk=listing.pk)
        if listing.owner_id != request.user.id:
            from apps.notifications.services import notify_listing_activity

            author_name = (request.user.full_name or request.user.phone or "Buyer").strip()
            preview = text or f"Rated {rating} stars"
            try:
                notify_listing_activity(
                    listing.owner,
                    listing,
                    f"Review on {listing.title}",
                    preview[:160],
                    sender_name=author_name,
                )
            except Exception:
                pass
        return Response(ListingSerializer(listing, context={"request": request}).data)


class ListingSaveView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, status=Listing.STATUS_APPROVED)
        row, created = ListingSave.objects.get_or_create(listing=listing, user=request.user)
        if not created:
            row.delete()
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data)


class SavedListingsView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        ids = ListingSave.objects.filter(user=request.user).values_list("listing_id", flat=True)
        items = exclude_sold_listings(
            listing_queryset().filter(pk__in=ids, status=Listing.STATUS_APPROVED)
        ).order_by("-created_at")[:200]
        return Response(ListingSerializer(items, many=True, context={"request": request}).data)


class MyReviewsGivenView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        rows = SellerReview.objects.filter(author=request.user).select_related("seller", "listing").order_by("-created_at")[:100]
        out = []
        for row in rows:
            seller = row.seller
            listing = row.listing
            out.append(
                {
                    "id": str(row.id),
                    "rating": row.rating,
                    "text": row.text,
                    "created_at": row.created_at.isoformat(),
                    "seller_id": str(seller.id),
                    "seller_name": seller.full_name or seller.phone or "Seller",
                    "listing_id": str(listing.id) if listing else "",
                    "listing_title": listing.title if listing else "",
                }
            )
        return Response(out)


class MySellerReviewsView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        from apps.listings.serializers import merged_seller_reviews_payload

        return Response(merged_seller_reviews_payload(request.user.id, {"request": request}, limit=100))


class StaffListingListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = listing_card_queryset().order_by("-created_at").exclude(status=Listing.STATUS_DRAFT)
        category = request.query_params.get("category")
        if category:
            cats = [item.strip() for item in category.split(",") if item.strip()]
            items = items.filter(category__in=cats)
        owner = (request.query_params.get("owner") or "").strip()
        if owner:
            items = items.filter(owner_id=owner)
        if request.query_params.get("urgent") == "1":
            items = items.filter(active_urgent_filter())
        counts = listing_counts(items)
        status_filter = request.query_params.get("status")
        if status_filter:
            items = items.filter(status=status_filter)
        page, page_size = parse_page(request, default_size=20, max_size=50)
        page_items, meta = paginate_queryset(items, page, page_size)
        rows = ListingSerializer(page_items, many=True, context=compact_listing_context(request, page_items)).data
        return Response({
            "results": rows,
            **meta,
            "counts": counts,
        })


class StaffListingDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        serializer = ListingStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        next_status = serializer.validated_data["status"]
        reason = (serializer.validated_data.get("reason") or "").strip()
        if listing.has_pending_edit and listing.status == Listing.STATUS_APPROVED:
            if next_status == Listing.STATUS_APPROVED:
                listing = apply_pending_edit(listing)
            else:
                listing.pending_edit = {}
                listing.photos.filter(is_pending=True).delete()
                listing.admin_reason = reason
                listing.reviewed_at = timezone.now()
                listing.save(update_fields=["pending_edit", "admin_reason", "reviewed_at", "updated_at"])
        else:
            listing.status = next_status
            listing.admin_reason = reason
            listing.reviewed_at = timezone.now()
            listing.is_promoted = False
            if next_status == Listing.STATUS_APPROVED:
                listing.pending_edit = {}
            listing.save(update_fields=["status", "admin_reason", "reviewed_at", "is_promoted", "pending_edit", "updated_at"])
            if next_status in {Listing.STATUS_REJECTED, Listing.STATUS_DEACTIVATED}:
                from apps.promotions.boost_service import pause_boosts_for_listing, sync_listing_promoted_flag

                pause_boosts_for_listing(
                    listing.id,
                    reason=f"Listing {next_status} by admin",
                )
                sync_listing_promoted_flag(listing.id)
        listing = listing_queryset().get(pk=listing.pk)
        bump_listing_feed_cache()
        return Response(ListingSerializer(listing, context={"request": request}).data)

    def delete(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        listing.delete()
        bump_listing_feed_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffListingPhotoView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk, photo_id):
        photo = get_object_or_404(ListingPhoto, pk=photo_id, listing_id=pk)
        content_type, _ = mimetypes.guess_type(photo.image.name)
        return FileResponse(photo.image.open("rb"), content_type=content_type or "application/octet-stream")


class StaffListingUrgentView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        if request.data.get("remove"):
            listing.is_urgent = False
            listing.urgent_ends_at = None
            listing.save(update_fields=["is_urgent", "urgent_ends_at", "updated_at"])
            listing = listing_queryset().get(pk=listing.pk)
            return Response(ListingSerializer(listing, context={"request": request}).data)

        hours = request.data.get("duration_hours")
        days = request.data.get("duration_days")
        try:
            hours = float(hours) if hours is not None else 0
            days = float(days) if days is not None else 0
        except (TypeError, ValueError):
            return Response({"detail": "Invalid duration."}, status=status.HTTP_400_BAD_REQUEST)
        total_hours = hours + days * 24
        if total_hours <= 0:
            return Response({"detail": "Set duration_hours or duration_days."}, status=status.HTTP_400_BAD_REQUEST)
        if listing.status != Listing.STATUS_APPROVED:
            return Response({"detail": "Only approved listings can join Urgent Sell."}, status=status.HTTP_400_BAD_REQUEST)
        if is_sold_extras(listing.extras):
            return Response({"detail": "Sold listings cannot be urgent."}, status=status.HTTP_400_BAD_REQUEST)

        expire_urgent_listings()
        active = Listing.objects.filter(is_urgent=True, urgent_ends_at__gt=timezone.now()).count()
        if active >= 12 and not (listing.is_urgent and listing.urgent_ends_at and listing.urgent_ends_at > timezone.now()):
            return Response({"detail": "Urgent Sell queue is full. Remove one first."}, status=status.HTTP_400_BAD_REQUEST)

        listing.is_urgent = True
        listing.urgent_ends_at = timezone.now() + timezone.timedelta(hours=total_hours)
        listing.save(update_fields=["is_urgent", "urgent_ends_at", "updated_at"])
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data)


class StaffUrgentListingListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        expire_urgent_listings()
        items = listing_queryset().filter(active_urgent_filter()).order_by("urgent_ends_at")
        return Response(ListingSerializer(items, many=True, context={"request": request}).data)


class StaffPromoteListingListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = (
            listing_queryset()
            .filter(status=Listing.STATUS_APPROVED, promote_requested=True, is_promoted=False)
            .order_by("-updated_at")
        )
        return Response(ListingSerializer(items, many=True, context={"request": request}).data)


class StaffListingPromoteView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        if request.data.get("remove"):
            listing.is_promoted = False
            listing.promote_requested = False
            listing.save(update_fields=["is_promoted", "promote_requested", "updated_at"])
            listing = listing_queryset().get(pk=listing.pk)
            return Response(ListingSerializer(listing, context={"request": request}).data)
        if listing.status != Listing.STATUS_APPROVED:
            return Response({"detail": "Only approved listings can be featured."}, status=status.HTTP_400_BAD_REQUEST)
        listing.is_promoted = True
        listing.save(update_fields=["is_promoted", "updated_at"])
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data)
