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

from apps.accounts.authentication import AppJWTAuthentication, OptionalAppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.listings.models import Listing, ListingComment, ListingPhoto, ListingReview, ListingSave
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


class ListingFeedView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        items = listing_queryset().filter(status=Listing.STATUS_APPROVED)
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
        if place and geo_q is not None:
            items = items.filter(place_q | geo_q)
        elif place:
            items = items.filter(place_q)
        elif geo_q is not None:
            items = items.filter(geo_q)
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
        serializer = ListingWriteSerializer(listing, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        listing = listing_queryset().get(pk=listing.pk)
        return Response(ListingSerializer(listing, context={"request": request}).data)

    def delete(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, owner=request.user)
        listing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        ListingReview.objects.update_or_create(
            listing=listing,
            author=request.user,
            defaults={"rating": serializer.validated_data["rating"], "text": serializer.validated_data["text"].strip()},
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
            listing.is_promoted = listing.status == Listing.STATUS_APPROVED and listing.promote_requested
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
