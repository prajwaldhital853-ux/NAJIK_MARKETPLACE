"""
Permission checking utilities and decorators for RBAC.
"""
from functools import wraps
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """
    Permission class for REST framework views.
    Allows access only to authenticated staff users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            hasattr(request.user, 'is_authenticated') and
            request.user.is_authenticated and
            getattr(request.user, 'is_active', False)
        )


def require_permission(permission_code: str):
    """
    Decorator to require specific permission for a view.
    Usage: @require_permission('users.view')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(view_instance, request, *args, **kwargs):
            if not hasattr(request, 'user') or not request.user:
                raise PermissionDenied("Authentication required")
            
            if not request.user.has_permission(permission_code):
                raise PermissionDenied(
                    f"You don't have permission to perform this action. "
                    f"Required: {permission_code}"
                )
            
            return view_func(view_instance, request, *args, **kwargs)
        return wrapper
    return decorator


def require_any_permission(*permission_codes):
    """
    Decorator to require at least one of the specified permissions.
    Usage: @require_any_permission('users.view', 'users.update')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(view_instance, request, *args, **kwargs):
            if not hasattr(request, 'user') or not request.user:
                raise PermissionDenied("Authentication required")
            
            for perm in permission_codes:
                if request.user.has_permission(perm):
                    return view_func(view_instance, request, *args, **kwargs)
            
            raise PermissionDenied(
                f"You don't have permission to perform this action. "
                f"Required one of: {', '.join(permission_codes)}"
            )
        return wrapper
    return decorator


def require_all_permissions(*permission_codes):
    """
    Decorator to require all specified permissions.
    Usage: @require_all_permissions('users.view', 'users.update')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(view_instance, request, *args, **kwargs):
            if not hasattr(request, 'user') or not request.user:
                raise PermissionDenied("Authentication required")
            
            missing = []
            for perm in permission_codes:
                if not request.user.has_permission(perm):
                    missing.append(perm)
            
            if missing:
                raise PermissionDenied(
                    f"You don't have permission to perform this action. "
                    f"Missing: {', '.join(missing)}"
                )
            
            return view_func(view_instance, request, *args, **kwargs)
        return wrapper
    return decorator


def is_super_admin(user) -> bool:
    """Check if user is super admin."""
    return hasattr(user, 'is_super_admin') and user.is_super_admin


def require_super_admin(view_func):
    """
    Decorator to require super admin access.
    Usage: @require_super_admin
    """
    @wraps(view_func)
    def wrapper(view_instance, request, *args, **kwargs):
        if not hasattr(request, 'user') or not request.user:
            raise PermissionDenied("Authentication required")
        
        if not is_super_admin(request.user):
            raise PermissionDenied(
                "This action requires super admin privileges"
            )
        
        return view_func(view_instance, request, *args, **kwargs)
    return wrapper


class PermissionChecker:
    """
    Context-aware permission checker.
    Usage in views:
        checker = PermissionChecker(request.user)
        if checker.can('users.view'):
            ...
    """
    def __init__(self, user):
        self.user = user
        self._permissions_cache = None

    def can(self, permission_code: str) -> bool:
        """Check if user has permission."""
        if not self.user:
            return False
        return self.user.has_permission(permission_code)

    def can_any(self, *permission_codes) -> bool:
        """Check if user has any of the permissions."""
        return any(self.can(perm) for perm in permission_codes)

    def can_all(self, *permission_codes) -> bool:
        """Check if user has all permissions."""
        return all(self.can(perm) for perm in permission_codes)

    def get_permissions(self) -> set:
        """Get all user permissions (cached)."""
        if self._permissions_cache is None:
            self._permissions_cache = self.user.get_all_permissions() if self.user else set()
        return self._permissions_cache

    def require(self, permission_code: str):
        """Raise PermissionDenied if user doesn't have permission."""
        if not self.can(permission_code):
            raise PermissionDenied(
                f"You don't have permission to perform this action. "
                f"Required: {permission_code}"
            )
