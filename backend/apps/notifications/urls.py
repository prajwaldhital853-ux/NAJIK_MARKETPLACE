from django.urls import path

from apps.notifications.views import ActiveNoticeImageView, ActiveNoticeListView
from apps.notifications.views.inbox import InboxDismissTargetView, InboxListView, InboxMarkView, InboxReadAllView
from apps.notifications.views.push import PushTokenRegisterView, PushTokenUnregisterView

urlpatterns = [
    path("active/", ActiveNoticeListView.as_view(), name="app-notices-active"),
    path("inbox/", InboxListView.as_view(), name="app-inbox"),
    path("inbox/read-all/", InboxReadAllView.as_view(), name="app-inbox-read-all"),
    path("inbox/dismiss/", InboxDismissTargetView.as_view(), name="app-inbox-dismiss"),
    path("push-token/", PushTokenRegisterView.as_view(), name="app-push-token"),
    path("push-token/unregister/", PushTokenUnregisterView.as_view(), name="app-push-token-unregister"),
    path("inbox/<uuid:pk>/", InboxMarkView.as_view(), name="app-inbox-mark"),
    path("<uuid:pk>/image/", ActiveNoticeImageView.as_view(), name="app-notice-image"),
]
