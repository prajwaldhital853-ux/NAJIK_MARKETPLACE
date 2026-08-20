from django.urls import path

from apps.notifications.views import ActiveNoticeImageView, ActiveNoticeListView

urlpatterns = [
    path("active/", ActiveNoticeListView.as_view(), name="app-notices-active"),
    path("<uuid:pk>/image/", ActiveNoticeImageView.as_view(), name="app-notice-image"),
]
