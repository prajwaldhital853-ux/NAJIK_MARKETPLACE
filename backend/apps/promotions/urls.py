from django.urls import path

from apps.promotions.views import (
    BoostPricingView,
    CreateBoostCampaignView,
    MyBoostCampaignsView,
)

urlpatterns = [
    path("boost-pricing/", BoostPricingView.as_view(), name="boost-pricing"),
    path("boost-campaigns/", MyBoostCampaignsView.as_view(), name="my-boost-campaigns"),
    path("boost-campaigns/create/", CreateBoostCampaignView.as_view(), name="create-boost-campaign"),
]
