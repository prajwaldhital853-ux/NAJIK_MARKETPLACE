from django.urls import path

from apps.core.views.app_control import PublicHomeBannerImageView, PublicHomeBannersView

urlpatterns = [
    path("home-banners/", PublicHomeBannersView.as_view(), name="public-home-banners"),
    path("home-banners/<uuid:pk>/image/", PublicHomeBannerImageView.as_view(), name="public-home-banner-image"),
]
