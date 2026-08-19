from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.accounts.models import LoginLockout

LOCKOUT_AFTER = 4
LOCKOUT_MINUTES = 10


class LoginLocked(APIException):
    status_code = 429
    default_detail = "Too many failed login attempts. Try again later."
    default_code = "locked"

    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(
            detail={
                "detail": f"Account locked. Try again in {retry_after} seconds.",
                "retry_after": retry_after,
            }
        )


def normalize_identifier(raw: str) -> str:
    value = (raw or "").strip()
    if "@" in value:
        return value.lower()
    digits = "".join(ch for ch in value if ch.isdigit())
    if digits.startswith("977") and len(digits) == 13:
        digits = digits[3:]
    return digits or value.lower()


def lockout_remaining(row: LoginLockout | None) -> int:
    if row is None or row.locked_until is None:
        return 0
    seconds = int((row.locked_until - timezone.now()).total_seconds())
    return max(0, seconds)


def assert_not_locked(identifier: str) -> None:
    row = LoginLockout.objects.filter(identifier=identifier).first()
    remaining = lockout_remaining(row)
    if remaining:
        raise LoginLocked(remaining)


def record_failure(identifier: str) -> LoginLockout:
    row, _ = LoginLockout.objects.get_or_create(identifier=identifier)
    now = timezone.now()
    if row.locked_until and row.locked_until <= now:
        row.fail_count = 0
        row.locked_until = None
    row.fail_count += 1
    row.last_failed_at = now
    if row.fail_count >= LOCKOUT_AFTER:
        row.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        row.fail_count = 0
    row.save()
    return row


def record_success(identifier: str) -> None:
    LoginLockout.objects.filter(identifier=identifier).update(
        fail_count=0,
        locked_until=None,
        last_failed_at=None,
    )
