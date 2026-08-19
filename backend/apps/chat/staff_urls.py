from django.urls import path

from apps.chat.views import StaffChatMessageFileView, StaffChatReportDetailView, StaffChatReportListView

urlpatterns = [
    path("reports/", StaffChatReportListView.as_view(), name="staff-chat-reports"),
    path("reports/<uuid:pk>/", StaffChatReportDetailView.as_view(), name="staff-chat-report-detail"),
    path("messages/<uuid:pk>/file/", StaffChatMessageFileView.as_view(), name="staff-chat-message-file"),
]
