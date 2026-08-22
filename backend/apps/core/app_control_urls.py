from django.urls import path

from apps.core.views.app_control import PublicHomeBannerImageView, PublicHomeBannerView

urlpatterns = [
    path("home-banner/", PublicHomeBannerView.as_view(), name="public-home-banner"),
    path("home-banner/image/", PublicHomeBannerImageView.as_view(), name="public-home-banner-image"),
]
