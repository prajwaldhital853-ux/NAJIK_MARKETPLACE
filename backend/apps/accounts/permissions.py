from rest_framework.permissions import BasePermission


class IsAppUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.__class__.__name__ == "AppUser"):
            return False
        # ID card / me can stay available for blocked or deactivated accounts.
        if getattr(view, "allow_inactive", False):
            return True
        return bool(getattr(user, "is_active", False))
