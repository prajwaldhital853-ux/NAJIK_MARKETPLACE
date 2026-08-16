from rest_framework.permissions import BasePermission


class IsAppUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.__class__.__name__ == "AppUser")
