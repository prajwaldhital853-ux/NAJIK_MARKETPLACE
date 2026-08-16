from django.urls import path

from apps.accounts.views.login import LoginView
from apps.accounts.views.logout import LogoutView
from apps.accounts.views.me import MeView
from apps.accounts.views.refresh import RefreshView
from apps.accounts.views.register import RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="app-register"),
    path("login/", LoginView.as_view(), name="app-login"),
    path("refresh/", RefreshView.as_view(), name="app-refresh"),
    path("logout/", LogoutView.as_view(), name="app-logout"),
    path("me/", MeView.as_view(), name="app-me"),
]
