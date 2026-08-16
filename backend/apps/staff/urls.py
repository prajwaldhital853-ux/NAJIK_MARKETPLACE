from django.urls import path

from apps.staff.views.login import StaffLoginView
from apps.staff.views.logout import StaffLogoutView
from apps.staff.views.me import StaffMeView
from apps.staff.views.refresh import StaffRefreshView

urlpatterns = [
    path("login/", StaffLoginView.as_view(), name="staff-login"),
    path("refresh/", StaffRefreshView.as_view(), name="staff-refresh"),
    path("logout/", StaffLogoutView.as_view(), name="staff-logout"),
    path("me/", StaffMeView.as_view(), name="staff-me"),
]
