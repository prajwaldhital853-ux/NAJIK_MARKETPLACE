"""Staff app URL configuration with RBAC endpoints."""
from django.urls import path

from apps.staff.views.login import (
    EmailVerificationView,
    ResendVerificationView,
    StaffLockoutStatusView,
    StaffLoginView,
)
from apps.staff.views.logout import StaffLogoutView
from apps.staff.views.refresh import StaffRefreshView
from apps.staff.views.me import StaffMeView
from apps.staff.views.password import (
    PasswordChangeView,
    PasswordStrengthCheckView,
)
from apps.staff.views.staff_management import (
    StaffListCreateView,
    StaffDetailView,
    StaffResetPasswordView,
)
from apps.staff.views.role_management import (
    PermissionListView,
    RoleListCreateView,
    RoleDetailView,
)

app_name = "staff"

urlpatterns = [
    # Authentication
    path("login/", StaffLoginView.as_view(), name="login"),
    path("login/lockout/", StaffLockoutStatusView.as_view(), name="login-lockout"),
    path("verify-email/", EmailVerificationView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),
    path("logout/", StaffLogoutView.as_view(), name="logout"),
    path("refresh/", StaffRefreshView.as_view(), name="refresh"),
    
    # Current user
    path("me/", StaffMeView.as_view(), name="me"),
    path("me/password/", PasswordChangeView.as_view(), name="change-password"),
    path("password/check-strength/", PasswordStrengthCheckView.as_view(), name="password-strength"),
    
    # Staff management (super admin only)
    path("staff/", StaffListCreateView.as_view(), name="staff-list"),
    path("staff/<uuid:staff_id>/", StaffDetailView.as_view(), name="staff-detail"),
    path("staff/<uuid:staff_id>/reset-password/", StaffResetPasswordView.as_view(), name="staff-reset-password"),
    
    # Role & Permission management (super admin only)
    path("roles/", RoleListCreateView.as_view(), name="roles-list-create"),
    path("roles/<uuid:role_id>/", RoleDetailView.as_view(), name="role-detail"),
    path("permissions/", PermissionListView.as_view(), name="permissions-list"),
]
