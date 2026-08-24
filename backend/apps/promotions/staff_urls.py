from django.urls import path

from apps.promotions.views import (
    StaffBoostCampaignsView,
    StaffBoostCampaignControlView,
    StaffBoostPricingView,
)

urlpatterns = [
    path("boost-pricing/", StaffBoostPricingView.as_view(), name="staff-boost-pricing"),
    path("boost-campaigns/", StaffBoostCampaignsView.as_view(), name="staff-boost-campaigns"),
    path("boost-campaigns/<uuid:pk>/", StaffBoostCampaignControlView.as_view(), name="staff-boost-campaign-control"),
]
