from django.urls import path

from apps.chat.views import (
    ChatBlockView,
    ChatMessageCreateView,
    ChatMessageFileView,
    ChatReportView,
    ChatThreadDetailView,
    ChatThreadListView,
    PresenceView,
)

urlpatterns = [
    path("presence/", PresenceView.as_view(), name="chat-presence"),
    path("threads/", ChatThreadListView.as_view(), name="chat-threads"),
    path("threads/<uuid:pk>/", ChatThreadDetailView.as_view(), name="chat-thread-detail"),
    path("threads/<uuid:pk>/messages/", ChatMessageCreateView.as_view(), name="chat-messages"),
    path("threads/<uuid:pk>/block/", ChatBlockView.as_view(), name="chat-block"),
    path("threads/<uuid:pk>/report/", ChatReportView.as_view(), name="chat-report"),
    path("messages/<uuid:pk>/file/", ChatMessageFileView.as_view(), name="chat-message-file"),
]
