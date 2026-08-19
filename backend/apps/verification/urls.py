from django.urls import path

from apps.verification.views import ProviderApplicationMeFileView, ProviderApplicationMeView

urlpatterns = [
    path("applications/me/file/<str:kind>/", ProviderApplicationMeFileView.as_view(), name="provider-application-me-file"),
    path("applications/me/", ProviderApplicationMeView.as_view(), name="provider-application-me"),
]
