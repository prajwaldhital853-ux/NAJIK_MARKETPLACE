from django.urls import path

from apps.accounts.views.google import GoogleAuthView
from apps.accounts.views.login import LoginView
from apps.accounts.views.logout import LogoutView
from apps.accounts.views.me import MePhotoView, MeView
from apps.accounts.views.otp import OtpRequestView, OtpVerifyView
from apps.accounts.views.password_reset import PasswordResetConfirmView, PasswordResetRequestView
from apps.accounts.views.refresh import RefreshView
from apps.accounts.views.register import RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="app-register"),
    path("login/", LoginView.as_view(), name="app-login"),
    path("google/", GoogleAuthView.as_view(), name="app-google"),
    path("otp/request/", OtpRequestView.as_view(), name="app-otp-request"),
    path("otp/verify/", OtpVerifyView.as_view(), name="app-otp-verify"),
    path("refresh/", RefreshView.as_view(), name="app-refresh"),
    path("logout/", LogoutView.as_view(), name="app-logout"),
    path("me/photo/", MePhotoView.as_view(), name="app-me-photo"),
    path("me/", MeView.as_view(), name="app-me"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="app-password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="app-password-reset-confirm"),
]
