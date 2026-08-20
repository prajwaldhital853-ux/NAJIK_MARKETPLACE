from django.urls import path

from apps.core.views.branding import PublicSignatoryImageView, StaffBrandingView

urlpatterns = [
    path("signatory/", PublicSignatoryImageView.as_view(), name="branding-signatory"),
    path("admin/", StaffBrandingView.as_view(), name="staff-branding"),
]
