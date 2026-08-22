from django.urls import path

from apps.accounts.views.referral import StaffReferEarnConfigView, StaffReferralListView
from apps.core.views.app_control import (
    StaffHomeBannerDetailView,
    StaffHomeBannerListCreateView,
    StaffProviderLedgerListCreateView,
    StaffProviderPlanDetailView,
    StaffProviderPlanListCreateView,
)

urlpatterns = [
    path("home-banners/", StaffHomeBannerListCreateView.as_view(), name="staff-home-banners"),
    path("home-banners/<uuid:pk>/", StaffHomeBannerDetailView.as_view(), name="staff-home-banner-detail"),
    path("provider-plans/", StaffProviderPlanListCreateView.as_view(), name="staff-provider-plans"),
    path("provider-plans/<uuid:pk>/", StaffProviderPlanDetailView.as_view(), name="staff-provider-plan-detail"),
    path("provider-ledger/", StaffProviderLedgerListCreateView.as_view(), name="staff-provider-ledger"),
    path("refer-earn/", StaffReferEarnConfigView.as_view(), name="staff-refer-earn"),
    path("referrals/", StaffReferralListView.as_view(), name="staff-referrals"),
]
