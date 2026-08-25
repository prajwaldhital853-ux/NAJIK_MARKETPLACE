"""Enhanced rate throttles for security."""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class StaffLoginRateThrottle(AnonRateThrottle):
    """
    Aggressive rate limiting for login attempts.
    3 attempts per minute per IP address.
    """
    scope = "staff_login"
    rate = "3/min"


class StaffAPIRateThrottle(UserRateThrottle):
    """
    General API rate limit for authenticated staff.
    100 requests per minute per user.
    """
    scope = "staff_api"
    rate = "100/min"


class StaffCreateRateThrottle(UserRateThrottle):
    """
    Rate limit for creating staff accounts.
    5 creates per hour per super admin.
    """
    scope = "staff_create"
    rate = "5/hour"
