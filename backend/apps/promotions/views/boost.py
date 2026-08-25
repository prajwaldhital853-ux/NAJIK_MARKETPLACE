"""Boost campaign endpoints for sellers and staff."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.listings.models import Listing
from apps.promotions.boost_service import (
    BoostLimitReachedError,
    InsufficientBalanceError,
    create_boost_campaign,
    expire_campaigns,
    listing_can_be_boosted,
    pause_boost_campaign,
    paisa_to_label,
    resume_boost_campaign,
    rupees_to_paisa,
)
from apps.promotions.models import BoostCampaign, BoostPricing
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import require_rbac_method


class BoostPricingSerializer(serializers.ModelSerializer):
    packages = serializers.SerializerMethodField()
    
    class Meta:
        model = BoostPricing
        fields = (
            "boost_3d_rupees",
            "boost_7d_rupees",
            "boost_14d_rupees",
            "boost_30d_rupees",
            "max_active_boosts_per_seller",
            "seller_view_multiplier",
            "is_active",
            "packages",
        )
    
    def get_packages(self, obj):
        return [
            {
                "days": 3,
                "price_rupees": obj.boost_3d_rupees,
                "price_label": f"Rs. {obj.boost_3d_rupees}",
                "est_views": obj.get_estimated_views(3),
                "est_inquiries": obj.get_estimated_inquiries(3),
            },
            {
                "days": 7,
                "price_rupees": obj.boost_7d_rupees,
                "price_label": f"Rs. {obj.boost_7d_rupees}",
                "est_views": obj.get_estimated_views(7),
                "est_inquiries": obj.get_estimated_inquiries(7),
            },
            {
                "days": 14,
                "price_rupees": obj.boost_14d_rupees,
                "price_label": f"Rs. {obj.boost_14d_rupees}",
                "est_views": obj.get_estimated_views(14),
                "est_inquiries": obj.get_estimated_inquiries(14),
            },
            {
                "days": 30,
                "price_rupees": obj.boost_30d_rupees,
                "price_label": f"Rs. {obj.boost_30d_rupees}",
                "est_views": obj.get_estimated_views(30),
                "est_inquiries": obj.get_estimated_inquiries(30),
            },
        ]


class BoostCampaignSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_category = serializers.CharField(source="listing.category", read_only=True)
    price_paid_label = serializers.SerializerMethodField()
    days_remaining = serializers.IntegerField(read_only=True)
    hours_remaining = serializers.IntegerField(read_only=True)
    display_view_count = serializers.SerializerMethodField()
    is_paused = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = BoostCampaign
        fields = (
            "id",
            "listing",
            "listing_title",
            "listing_category",
            "status",
            "duration_days",
            "price_paid_paisa",
            "price_paid_label",
            "starts_at",
            "ends_at",
            "days_remaining",
            "hours_remaining",
            "impression_count",
            "view_count",
            "display_view_count",
            "inquiry_count",
            "is_paused",
            "paused_at",
            "created_at",
        )
    
    def get_price_paid_label(self, obj):
        return paisa_to_label(obj.price_paid_paisa)
    
    def get_display_view_count(self, obj):
        """Same as view_count — real detail opens, no inflation."""
        return obj.view_count


class BoostPricingView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    
    def get(self, request):
        pricing = BoostPricing.get_solo()
        return Response(BoostPricingSerializer(pricing).data)


class CreateBoostCampaignView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    
    def post(self, request):
        listing_id = request.data.get("listing_id")
        duration_days = request.data.get("duration_days")
        
        if not listing_id or not duration_days:
            return Response(
                {"detail": "listing_id and duration_days required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            duration_days = int(duration_days)
            if duration_days not in [3, 7, 14, 30]:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"detail": "duration_days must be 3, 7, 14, or 30."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        listing = get_object_or_404(
            Listing.objects.filter(owner=request.user, status=Listing.STATUS_APPROVED),
            pk=listing_id,
        )

        if not listing_can_be_boosted(listing):
            return Response(
                {"detail": "This listing cannot be boosted. It may be sold, inactive, or already boosted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            campaign = create_boost_campaign(request.user, listing, duration_days)
            return Response(BoostCampaignSerializer(campaign).data, status=status.HTTP_201_CREATED)
        except InsufficientBalanceError as e:
            return Response({"detail": str(e)}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except BoostLimitReachedError as e:
            return Response({"detail": str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MyBoostCampaignsView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    
    def get(self, request):
        expire_campaigns()
        
        status_filter = request.query_params.get("status") or "all"
        
        campaigns = BoostCampaign.objects.filter(seller=request.user).select_related("listing")
        
        if status_filter == "active":
            campaigns = campaigns.filter(
                status__in=[BoostCampaign.STATUS_ACTIVE, BoostCampaign.STATUS_PAUSED],
            ).filter(
                Q(status=BoostCampaign.STATUS_PAUSED) | Q(ends_at__gt=timezone.now()),
            )
        elif status_filter == "paused":
            campaigns = campaigns.filter(status=BoostCampaign.STATUS_PAUSED)
        elif status_filter == "expired":
            campaigns = campaigns.filter(status=BoostCampaign.STATUS_EXPIRED)
        elif status_filter == "cancelled":
            campaigns = campaigns.filter(status=BoostCampaign.STATUS_CANCELLED)
        
        campaigns = campaigns.order_by("-created_at")[:50]
        
        return Response(BoostCampaignSerializer(campaigns, many=True).data)


class SellerBoostCampaignControlView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        campaign = get_object_or_404(BoostCampaign, pk=pk, seller=request.user)
        action = (request.data.get("action") or "").strip().lower()

        try:
            if action == "pause":
                campaign = pause_boost_campaign(campaign)
            elif action == "resume":
                campaign = resume_boost_campaign(campaign)
            else:
                return Response({"detail": "Use action pause or resume."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(BoostCampaignSerializer(campaign).data)


# Staff endpoints

class StaffBoostPricingView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]
    
    def get(self, request):
        pricing = BoostPricing.get_solo()
        return Response(BoostPricingSerializer(pricing).data)
    
    def patch(self, request):
        require_rbac_method(request.user, "ads_promotions", "PATCH")
        pricing = BoostPricing.get_solo()
        
        for field in [
            "boost_3d_rupees",
            "boost_7d_rupees",
            "boost_14d_rupees",
            "boost_30d_rupees",
            "max_active_boosts_per_seller",
            "max_active_boosts_per_category",
            "max_active_boosts_platform",
            "rotation_interval_minutes",
            "max_slots_per_category_feed",
            "seller_view_multiplier",
            "is_active",
        ]:
            if field in request.data:
                try:
                    setattr(pricing, field, int(request.data[field]))
                except (TypeError, ValueError):
                    pass
        
        pricing.save()
        return Response(BoostPricingSerializer(pricing).data)


class StaffBoostCampaignsView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]
    
    def get(self, request):
        expire_campaigns()
        
        status_filter = request.query_params.get("status") or "all"
        
        campaigns = BoostCampaign.objects.select_related("listing", "seller").order_by("-created_at")
        
        if status_filter == "active":
            campaigns = campaigns.filter(status=BoostCampaign.STATUS_ACTIVE, ends_at__gt=timezone.now())
        elif status_filter == "paused":
            campaigns = campaigns.filter(status=BoostCampaign.STATUS_PAUSED)
        elif status_filter == "expired":
            campaigns = campaigns.filter(status=BoostCampaign.STATUS_EXPIRED)
        elif status_filter == "cancelled":
            campaigns = campaigns.filter(status=BoostCampaign.STATUS_CANCELLED)
        
        campaigns = campaigns[:200]
        
        rows = []
        for c in campaigns:
            rows.append({
                **BoostCampaignSerializer(c).data,
                "seller_name": c.seller.full_name or c.seller.phone or c.seller.email,
                "seller_id": str(c.seller.id),
            })
        
        return Response(rows)


class StaffBoostCampaignControlView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]
    
    def post(self, request, pk):
        require_rbac_method(request.user, "ads_promotions", "PATCH")
        campaign = get_object_or_404(BoostCampaign, pk=pk)
        
        action = request.data.get("action")
        
        if action == "pause":
            campaign = pause_boost_campaign(campaign, reason=(request.data.get("reason") or "")[:500])
            campaign.reviewed_by = request.user
            campaign.save(update_fields=["reviewed_by"])
            return Response(BoostCampaignSerializer(campaign).data)
        
        elif action == "resume":
            try:
                campaign = resume_boost_campaign(campaign)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            campaign.reviewed_by = request.user
            campaign.save(update_fields=["reviewed_by"])
            return Response(BoostCampaignSerializer(campaign).data)
        
        elif action == "cancel":
            campaign.status = BoostCampaign.STATUS_CANCELLED
            campaign.paused_at = None
            campaign.reviewed_by = request.user
            campaign.save()
            from apps.promotions.boost_service import sync_listing_promoted_flag

            sync_listing_promoted_flag(campaign.listing_id)
            return Response(BoostCampaignSerializer(campaign).data)
        
        elif action == "extend":
            hours = request.data.get("hours")
            try:
                hours = int(hours)
                if hours > 0:
                    campaign.admin_extended_hours += hours
                    from datetime import timedelta
                    campaign.ends_at = campaign.ends_at + timedelta(hours=hours)
                    campaign.save()
                    return Response(BoostCampaignSerializer(campaign).data)
            except (TypeError, ValueError):
                pass
        
        return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
