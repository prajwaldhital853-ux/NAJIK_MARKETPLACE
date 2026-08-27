from django.urls import path

from apps.accounts.views.referral import PublicReferEarnConfigView
from apps.core.views.app_control import PublicHomeBannerImageView, PublicHomeBannersView, PublicProviderPlansView
from apps.core.views.privacy_compliance import (
    PublicLegalDocumentView,
    PublicPrivacyRetentionView,
    StaffApplyRetentionView,
    StaffLegalDocumentDetailView,
    StaffLegalDocumentListView,
    StaffPrivacyRetentionView,
)
from apps.core.views.seller_wallet import PublicSellerPaymentConfigView, PublicSellerPaymentQrView

urlpatterns = [
    path("home-banners/", PublicHomeBannersView.as_view(), name="public-home-banners"),
    path("home-banners/<uuid:pk>/image/", PublicHomeBannerImageView.as_view(), name="public-home-banner-image"),
    path("provider-plans/", PublicProviderPlansView.as_view(), name="public-provider-plans"),
    path("refer-earn/", PublicReferEarnConfigView.as_view(), name="public-refer-earn"),
    path("seller-payments/", PublicSellerPaymentConfigView.as_view(), name="public-seller-payments"),
    path("seller-payments/qr/", PublicSellerPaymentQrView.as_view(), name="public-seller-payment-qr"),
    path("privacy-retention/", PublicPrivacyRetentionView.as_view(), name="public-privacy-retention"),
    path("legal/<str:doc_type>/", PublicLegalDocumentView.as_view(), name="public-legal-document"),
]
