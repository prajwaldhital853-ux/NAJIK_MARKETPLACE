from django.urls import path

from apps.reports.views import ComplaintCreateView

urlpatterns = [
    path("", ComplaintCreateView.as_view(), name="complaint-create"),
]
