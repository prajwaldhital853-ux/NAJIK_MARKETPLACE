from django.urls import path

from apps.promotions.views import (
    BoostPricingView,
    CreateBoostCampaignView,
    MyBoostCampaignsView,
    SellerBoostCampaignControlView,
)

urlpatterns = [
    path("boost-pricing/", BoostPricingView.as_view(), name="boost-pricing"),
    path("boost-campaigns/", MyBoostCampaignsView.as_view(), name="my-boost-campaigns"),
    path("boost-campaigns/create/", CreateBoostCampaignView.as_view(), name="create-boost-campaign"),
    path("boost-campaigns/<uuid:pk>/", SellerBoostCampaignControlView.as_view(), name="seller-boost-campaign-control"),
]
