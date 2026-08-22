from django.urls import path

from apps.core.views.app_control import StaffHomeBannerDetailView, StaffHomeBannerListCreateView

urlpatterns = [
    path("home-banners/", StaffHomeBannerListCreateView.as_view(), name="staff-home-banners"),
    path("home-banners/<uuid:pk>/", StaffHomeBannerDetailView.as_view(), name="staff-home-banner-detail"),
]
