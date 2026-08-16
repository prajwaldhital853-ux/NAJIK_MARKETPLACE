from django.urls import path

from apps.core.views.health import HealthView

urlpatterns = [
    path("", HealthView.as_view(), name="health"),
]
