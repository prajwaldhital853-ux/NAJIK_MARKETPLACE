import mimetypes
import re
from math import cos, radians

from django.db.models import Avg, F, Prefetch, Q
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


from apps.listings.urgent import active_urgent_filter, exclude_sold_listings, expire_urgent_listings, is_sold_extras


class ListingFeedView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        expire_urgent_listings()
        items = exclude_sold_listings(listing_queryset().filter(status=Listing.STATUS_APPROVED))
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
            items = items.filter(place_q | geo_q | (no_coords & place_q))
        elif place:
            items = items.filter(place_q)
        elif geo_q is not None:
            # Listings without map coordinates still appear nationally until coords are set.
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
        rows = ListingSerializer(items[:200], many=True, context={"request": request}).data
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
        return Response(rows)


class ListingPublicDetailView(APIView):
    authentication_classes = [OptionalAppJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, pk):
        listing = get_object_or_404(listing_queryset(), pk=pk)
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        is_owner = bool(user and getattr(user, "id", None) == listing.owner_id)
        if listing.status != Listing.STATUS_APPROVED and not is_owner:
            return Response({"detail": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)
        if listing.status == Listing.STATUS_APPROVED and not is_owner:
            Listing.objects.filter(pk=listing.pk).update(view_count=F("view_count") + 1)
            listing.view_count += 1
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
        from apps.listings.serializers import SellerReviewSerializer, seller_reviews_for_owner
        from django.db.models import Avg

        review_rows = seller_reviews_for_owner(seller.id)
        rating_agg = review_rows.aggregate(a=Avg("rating"))
        rating_avg = round(rating_agg["a"] or 0, 1)
        review_count = review_rows.count()
        reviews = SellerReviewSerializer(review_rows[:50], many=True, context={"request": request}).data
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
        items = listing_queryset().filter(owner=request.user)
        return Response(ListingSerializer(items, many=True, context={"request": request}).data)

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
        listing.delete()
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
        ListingComment.objects.create(listing=listing, author=request.user, text=serializer.validated_data["text"].strip())
        listing = listing_queryset().get(pk=listing.pk)
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
        listing = listing_queryset().get(pk=listing.pk)
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


class StaffListingListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = listing_queryset().order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            items = items.filter(status=status_filter)
        else:
            items = items.exclude(status=Listing.STATUS_DRAFT)
        category = request.query_params.get("category")
        if category:
            cats = [item.strip() for item in category.split(",") if item.strip()]
            items = items.filter(category__in=cats)
        owner = (request.query_params.get("owner") or "").strip()
        if owner:
            items = items.filter(owner_id=owner)
        return Response(ListingSerializer(items, many=True, context={"request": request}).data)


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
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data)

    def delete(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        listing.delete()
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
