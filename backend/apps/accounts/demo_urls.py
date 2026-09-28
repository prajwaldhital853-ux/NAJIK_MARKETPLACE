from django.urls import path

from apps.accounts.views.demo_seed import StaffDemoSeedView

urlpatterns = [
    path("seed/", StaffDemoSeedView.as_view(), name="staff-demo-seed"),
]
