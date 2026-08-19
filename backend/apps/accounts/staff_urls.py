from django.urls import path

from apps.accounts.views.staff_users import StaffAppUserDetailView, StaffAppUserListView

urlpatterns = [
    path("", StaffAppUserListView.as_view(), name="staff-app-users"),
    path("<uuid:pk>/", StaffAppUserDetailView.as_view(), name="staff-app-user-detail"),
]
