from django.urls import path

from apps.accounts.views.google import GoogleAuthCallbackView, GoogleAuthView
from apps.accounts.views.login import LoginView
from apps.accounts.views.logout import LogoutView
from apps.accounts.views.me import MePhotoView, MeView
from apps.accounts.views.otp import OtpRequestView, OtpVerifyView
from apps.accounts.views.password_reset import PasswordResetConfirmView, PasswordResetRequestView
from apps.accounts.views.refresh import RefreshView
from apps.accounts.views.register import RegisterView
from apps.accounts.views.provider_register import GuestOtpRequestView, ProviderRegisterCompleteView
from apps.accounts.views.referral import ReferEarnMeView
from apps.accounts.views.seller_wallet import SellerLoadRequestCreateView, SellerPaymentsMeView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="app-register"),
    path("register/provider/complete/", ProviderRegisterCompleteView.as_view(), name="app-provider-register-complete"),
    path("login/", LoginView.as_view(), name="app-login"),
    path("google/", GoogleAuthView.as_view(), name="app-google"),
    path("google/callback/", GoogleAuthCallbackView.as_view(), name="app-google-callback"),
    path("otp/request/", OtpRequestView.as_view(), name="app-otp-request"),
    path("otp/guest-request/", GuestOtpRequestView.as_view(), name="app-otp-guest-request"),
    path("otp/verify/", OtpVerifyView.as_view(), name="app-otp-verify"),
    path("refresh/", RefreshView.as_view(), name="app-refresh"),
    path("logout/", LogoutView.as_view(), name="app-logout"),
    path("me/photo/", MePhotoView.as_view(), name="app-me-photo"),
    path("me/", MeView.as_view(), name="app-me"),
    path("payments/me/", SellerPaymentsMeView.as_view(), name="app-payments-me"),
    path("payments/load-requests/", SellerLoadRequestCreateView.as_view(), name="app-payments-load"),
    path("referrals/me/", ReferEarnMeView.as_view(), name="app-referrals-me"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="app-password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="app-password-reset-confirm"),
]
