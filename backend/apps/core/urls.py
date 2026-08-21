from django.urls import path

from apps.core.views.health import HealthView, StaffSystemStatusView

urlpatterns = [
    path("", HealthView.as_view(), name="health"),
    path("status/", StaffSystemStatusView.as_view(), name="staff-system-status"),
]
