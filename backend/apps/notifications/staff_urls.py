from django.urls import path

from apps.notifications.views import StaffNoticeDetailView, StaffNoticeImageView, StaffNoticeListCreateView

urlpatterns = [
    path("", StaffNoticeListCreateView.as_view(), name="staff-notices"),
    path("<uuid:pk>/", StaffNoticeDetailView.as_view(), name="staff-notice-detail"),
    path("<uuid:pk>/image/", StaffNoticeImageView.as_view(), name="staff-notice-image"),
]
