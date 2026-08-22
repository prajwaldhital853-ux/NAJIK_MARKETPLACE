from django.urls import path

from apps.core.views.app_control import (
    StaffHomeBannerDetailView,
    StaffHomeBannerListCreateView,
    StaffProviderLedgerListCreateView,
    StaffProviderPlanDetailView,
    StaffProviderPlanListCreateView,
)
from apps.core.views.seller_wallet import (
    StaffListingFeeRefundView,
    StaffLoadRequestApproveView,
    StaffLoadRequestListView,
    StaffLoadRequestProofView,
    StaffLoadRequestRejectView,
    StaffSellerPaymentConfigView,
    StaffSellerWalletAdjustView,
    StaffSellerWalletDetailView,
    StaffSellerWalletListView,
)

urlpatterns = [
    path("home-banners/", StaffHomeBannerListCreateView.as_view(), name="staff-home-banners"),
    path("home-banners/<uuid:pk>/", StaffHomeBannerDetailView.as_view(), name="staff-home-banner-detail"),
    path("provider-plans/", StaffProviderPlanListCreateView.as_view(), name="staff-provider-plans"),
    path("provider-plans/<uuid:pk>/", StaffProviderPlanDetailView.as_view(), name="staff-provider-plan-detail"),
    path("provider-ledger/", StaffProviderLedgerListCreateView.as_view(), name="staff-provider-ledger"),
    path("seller-payments/", StaffSellerPaymentConfigView.as_view(), name="staff-seller-payments"),
    path("load-requests/", StaffLoadRequestListView.as_view(), name="staff-load-requests"),
    path("load-requests/<uuid:pk>/approve/", StaffLoadRequestApproveView.as_view(), name="staff-load-approve"),
    path("load-requests/<uuid:pk>/reject/", StaffLoadRequestRejectView.as_view(), name="staff-load-reject"),
    path("load-requests/<uuid:pk>/proof/", StaffLoadRequestProofView.as_view(), name="staff-load-proof"),
    path("seller-wallets/", StaffSellerWalletListView.as_view(), name="staff-seller-wallets"),
    path("seller-wallets/<uuid:provider_id>/", StaffSellerWalletDetailView.as_view(), name="staff-seller-wallet-detail"),
    path("seller-wallets/<uuid:provider_id>/adjust/", StaffSellerWalletAdjustView.as_view(), name="staff-seller-wallet-adjust"),
    path("listings/<uuid:listing_id>/refund-fee/", StaffListingFeeRefundView.as_view(), name="staff-listing-fee-refund"),
]
