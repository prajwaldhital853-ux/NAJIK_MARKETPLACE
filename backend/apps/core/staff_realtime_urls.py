from django.urls import path

from apps.core.views.realtime import AdminEventStreamView

urlpatterns = [
    path("events/stream/", AdminEventStreamView.as_view(), name="admin-event-stream"),
]
