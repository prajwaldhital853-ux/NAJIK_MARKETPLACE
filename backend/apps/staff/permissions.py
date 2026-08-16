from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and getattr(user, "is_authenticated", False) and user.__class__.__name__ == "StaffUser"
        )
