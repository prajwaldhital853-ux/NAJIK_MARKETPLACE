from django.urls import path

from apps.verification.views import (
    ProviderIdCardMePrintView,
    ProviderIdCardMeQrView,
    ProviderIdCardMeView,
    PublicIdCardVerifyQrView,
    PublicIdCardVerifyView,
)

urlpatterns = [
    path("me/qr/", ProviderIdCardMeQrView.as_view(), name="provider-id-card-me-qr"),
    path("me/print/", ProviderIdCardMePrintView.as_view(), name="provider-id-card-me-print"),
    path("me/", ProviderIdCardMeView.as_view(), name="provider-id-card-me"),
    path("verify/<str:token>/qr/", PublicIdCardVerifyQrView.as_view(), name="public-id-card-verify-qr"),
    path("verify/<str:token>/", PublicIdCardVerifyView.as_view(), name="public-id-card-verify"),
]
