from django.urls import path

from apps.core.views.app_control import PublicHomeBannerImageView, PublicHomeBannersView, PublicProviderPlansView
from apps.accounts.views.referral import PublicReferEarnConfigView

urlpatterns = [
    path("home-banners/", PublicHomeBannersView.as_view(), name="public-home-banners"),
    path("home-banners/<uuid:pk>/image/", PublicHomeBannerImageView.as_view(), name="public-home-banner-image"),
    path("provider-plans/", PublicProviderPlansView.as_view(), name="public-provider-plans"),
    path("refer-earn/", PublicReferEarnConfigView.as_view(), name="public-refer-earn"),
]
