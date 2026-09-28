"""Super-admin API to seed or purge demo marketplace data (no shell required)."""
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.demo_seed_service import (
    API_MAX_SELLERS_PER_REQUEST,
    DEFAULT_LISTINGS_PER_SELLER,
    DEFAULT_SELLERS,
    purge_demo_sellers,
    run_demo_seed,
)
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


class StaffDemoSeedView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        if not getattr(request.user, "is_super_admin", False):
            return Response({"detail": "Super admin only."}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            {
                "enabled": bool(getattr(settings, "DEMO_SEED_ENABLED", False)),
                "max_sellers_per_request": API_MAX_SELLERS_PER_REQUEST,
                "default_sellers": DEFAULT_SELLERS,
                "default_listings_per_seller": DEFAULT_LISTINGS_PER_SELLER,
                "hint": (
                    "POST to seed in batches (no shell). Set DEMO_SEED_ENABLED=true on Render "
                    "if seeding production."
                ),
            }
        )

    def post(self, request):
        if not getattr(request.user, "is_super_admin", False):
            return Response({"detail": "Super admin only."}, status=status.HTTP_403_FORBIDDEN)
        if not getattr(settings, "DEMO_SEED_ENABLED", False):
            return Response(
                {
                    "detail": "Demo seed is disabled. Set DEMO_SEED_ENABLED=true in API environment.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data if isinstance(request.data, dict) else {}
        seller_count = int(data.get("seller_count") or API_MAX_SELLERS_PER_REQUEST)
        seller_offset = int(data.get("seller_offset") or 0)
        listings_per = int(data.get("listings_per_seller") or DEFAULT_LISTINGS_PER_SELLER)
        skip_photos = bool(data.get("skip_photos", True))
        password = str(data.get("password") or "demo123")[:128]

        seller_count = max(1, min(seller_count, API_MAX_SELLERS_PER_REQUEST))

        result = run_demo_seed(
            seller_count=seller_count,
            seller_offset=seller_offset,
            listings_per_seller=listings_per,
            password=password,
            skip_photos=skip_photos,
        )

        return Response(
            {
                "ok": True,
                "seller_offset": result.seller_offset,
                "sellers_processed": result.sellers_processed,
                "created_users": result.created_users,
                "created_apps": result.created_apps,
                "created_listings": result.created_listings,
                "photos_added": result.photos_added,
                "total_demo_sellers": result.total_demo_sellers,
                "total_demo_listings": result.total_demo_listings,
                "next_seller_offset": result.next_seller_offset,
                "done": result.done,
                "errors": result.errors[:10],
            }
        )

    def delete(self, request):
        if not getattr(request.user, "is_super_admin", False):
            return Response({"detail": "Super admin only."}, status=status.HTTP_403_FORBIDDEN)
        if not getattr(settings, "DEMO_SEED_ENABLED", False):
            return Response(
                {"detail": "Demo seed is disabled. Set DEMO_SEED_ENABLED=true in API environment."},
                status=status.HTTP_403_FORBIDDEN,
            )
        removed = purge_demo_sellers()
        return Response({"ok": True, "removed_sellers": removed})
