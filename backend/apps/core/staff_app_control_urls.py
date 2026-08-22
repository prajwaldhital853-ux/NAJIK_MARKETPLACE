from django.urls import path

from apps.core.views.app_control import StaffHomeBannerView

urlpatterns = [
    path("home-banner/", StaffHomeBannerView.as_view(), name="staff-home-banner"),
]
