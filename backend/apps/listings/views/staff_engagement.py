from django.db.models import Avg
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import ListingComment, SellerReview
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


class StaffEngagementSummaryView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        comments = ListingComment.objects.all()
        reviews = SellerReview.objects.all()
        comment_hidden = comments.filter(is_hidden=True).count()
        review_hidden = reviews.filter(is_hidden=True).count()
        rating_agg = reviews.filter(is_hidden=False).aggregate(a=Avg("rating"))
        return Response(
            {
                "comment_count": comments.count(),
                "review_count": reviews.count(),
                "comment_hidden": comment_hidden,
                "review_hidden": review_hidden,
                "rating_avg": round(rating_agg["a"] or 0, 1),
                "five_star": reviews.filter(is_hidden=False, rating=5).count(),
            }
        )


class StaffEngagementListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        kind = (request.query_params.get("kind") or "all").strip().lower()
        listing_id = (request.query_params.get("listing") or "").strip()
        hidden_only = request.query_params.get("hidden") == "1"
        rows = []

        if kind in ("all", "comment"):
            comments = ListingComment.objects.select_related("listing", "listing__owner", "author")
            if listing_id:
                comments = comments.filter(listing_id=listing_id)
            if hidden_only:
                comments = comments.filter(is_hidden=True)
            for row in comments.order_by("-created_at")[:500]:
                rows.append(
                    {
                        "id": str(row.id),
                        "kind": "comment",
                        "listing_id": str(row.listing_id),
                        "listing_title": row.listing.title,
                        "listing_owner_id": str(row.listing.owner_id),
                        "listing_owner_name": row.listing.owner.full_name or row.listing.owner.phone or "",
                        "listing_city": row.listing.city or row.listing.location,
                        "author_id": str(row.author_id),
                        "author_name": row.author.full_name or row.author.phone or "",
                        "rating": None,
                        "text": row.text,
                        "created_at": row.created_at.isoformat(),
                        "is_hidden": row.is_hidden,
                    }
                )

        if kind in ("all", "review"):
            reviews = SellerReview.objects.select_related("listing", "seller", "author")
            if listing_id:
                reviews = reviews.filter(listing_id=listing_id)
            if hidden_only:
                reviews = reviews.filter(is_hidden=True)
            for row in reviews.order_by("-created_at")[:500]:
                listing = row.listing
                listing_title = listing.title if listing else "—"
                listing_owner_id = str(row.seller_id)
                listing_owner_name = row.seller.full_name or row.seller.phone or ""
                listing_city = (listing.city or listing.location) if listing else ""
                rows.append(
                    {
                        "id": str(row.id),
                        "kind": "review",
                        "listing_id": str(listing.id) if listing else "",
                        "listing_title": listing_title,
                        "listing_owner_id": listing_owner_id,
                        "listing_owner_name": listing_owner_name,
                        "listing_city": listing_city,
                        "author_id": str(row.author_id),
                        "author_name": row.author.full_name or row.author.phone or "",
                        "rating": row.rating,
                        "text": row.text,
                        "created_at": row.created_at.isoformat(),
                        "is_hidden": row.is_hidden,
                    }
                )

        rows.sort(key=lambda item: item["created_at"], reverse=True)
        return Response(rows[:500])


class StaffEngagementActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("hide", "show", "delete"))


class StaffCommentModerationView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        row = get_object_or_404(ListingComment, pk=pk)
        serializer = StaffEngagementActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        if action == "delete":
            row.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        row.is_hidden = action == "hide"
        row.save(update_fields=["is_hidden"])
        return Response({"id": str(row.id), "is_hidden": row.is_hidden})


class StaffSellerReviewModerationView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        row = get_object_or_404(SellerReview, pk=pk)
        serializer = StaffEngagementActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        if action == "delete":
            row.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        row.is_hidden = action == "hide"
        row.save(update_fields=["is_hidden"])
        return Response({"id": str(row.id), "is_hidden": row.is_hidden})
