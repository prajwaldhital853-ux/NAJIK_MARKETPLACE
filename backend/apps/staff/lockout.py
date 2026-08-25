"""Staff account lockout helpers."""
from django.utils import timezone

from apps.staff.models import StaffUser

LOCKOUT_AFTER = 3
LOCKOUT_MINUTES = 10


def lockout_seconds_remaining(staff: StaffUser) -> int:
    if not staff.locked_until:
        return 0
    return max(0, int((staff.locked_until - timezone.now()).total_seconds()))


def lockout_payload(staff: StaffUser) -> dict:
    seconds = max(1, lockout_seconds_remaining(staff))
    minutes = max(1, (seconds + 59) // 60)
    return {
        "detail": (
            f"Account locked due to too many failed login attempts. "
            f"Try again in {minutes} minute(s)."
        ),
        "code": "account_locked",
        "locked_until": staff.locked_until.isoformat() if staff.locked_until else None,
        "seconds_remaining": seconds,
    }
