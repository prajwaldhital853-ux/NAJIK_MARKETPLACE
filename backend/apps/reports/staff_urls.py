from django.urls import path

from apps.reports.views import StaffComplaintDetailView, StaffComplaintListView

urlpatterns = [
    path("", StaffComplaintListView.as_view(), name="staff-complaints"),
    path("<uuid:pk>/", StaffComplaintDetailView.as_view(), name="staff-complaint-detail"),
]
