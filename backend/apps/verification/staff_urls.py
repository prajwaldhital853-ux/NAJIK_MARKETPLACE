from django.urls import path

from apps.verification.views import (
    StaffApplicationDetailView,
    StaffApplicationFileView,
    StaffApplicationListView,
)

urlpatterns = [
    path("applications/", StaffApplicationListView.as_view(), name="staff-applications"),
    path("applications/<uuid:pk>/", StaffApplicationDetailView.as_view(), name="staff-application-detail"),
    path(
        "applications/<uuid:pk>/file/<str:kind>/",
        StaffApplicationFileView.as_view(),
        name="staff-application-file",
    ),
]
