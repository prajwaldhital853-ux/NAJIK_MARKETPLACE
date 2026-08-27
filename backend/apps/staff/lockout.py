"""Device-scoped staff login lockout (email + browser device id; not IP or account-wide)."""
from datetime import timedelta

from django.utils import timezone

from apps.staff.models import StaffLoginLockout

LOCKOUT_AFTER = 3
LOCKOUT_MINUTES = 10


def staff_lock_key(email: str, ip_address: str | None, device_fingerprint: str) -> str:
    """Lock per staff email on this browser/device only — IP is ignored (shared office WiFi safe)."""
    normalized_email = (email or "").strip().lower()
    device = (device_fingerprint or "").strip() or "unknown"
    return f"{device}|{normalized_email}"


def lockout_seconds_remaining(row: StaffLoginLockout | None) -> int:
    if row is None or row.locked_until is None:
        return 0
    return max(0, int((row.locked_until - timezone.now()).total_seconds()))


def lockout_payload(row: StaffLoginLockout) -> dict:
    seconds = max(1, lockout_seconds_remaining(row))
    minutes = max(1, (seconds + 59) // 60)
    return {
        "detail": (
            f"Too many failed login attempts on this device. "
            f"Try again in {minutes} minute(s), or sign in from another browser or computer."
        ),
        "code": "account_locked",
        "locked_until": row.locked_until.isoformat() if row.locked_until else None,
        "seconds_remaining": seconds,
    }


def get_lockout_row(email: str, ip_address: str | None, device_fingerprint: str) -> StaffLoginLockout | None:
    key = staff_lock_key(email, ip_address, device_fingerprint)
    return StaffLoginLockout.objects.filter(lock_key=key).first()


def assert_login_not_locked(email: str, ip_address: str | None, device_fingerprint: str) -> None:
    from apps.staff.exceptions import StaffAccountLocked

    row = get_lockout_row(email, ip_address, device_fingerprint)
    if lockout_seconds_remaining(row):
        raise StaffAccountLocked(row)


def record_login_failure(email: str, ip_address: str | None, device_fingerprint: str) -> StaffLoginLockout:
    key = staff_lock_key(email, ip_address, device_fingerprint)
    row, _ = StaffLoginLockout.objects.get_or_create(
        lock_key=key,
        defaults={
            "email": email.strip().lower(),
            "ip_address": ip_address or None,
            "device_fingerprint": (device_fingerprint or "")[:255],
        },
    )
    now = timezone.now()
    if row.locked_until and row.locked_until <= now:
        row.fail_count = 0
        row.locked_until = None
    row.fail_count += 1
    row.last_failed_at = now
    if row.fail_count >= LOCKOUT_AFTER:
        row.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        row.fail_count = 0
    update_fields = ["fail_count", "last_failed_at", "locked_until"]
    if ip_address and row.ip_address != ip_address:
        row.ip_address = ip_address
        update_fields.append("ip_address")
    row.save(update_fields=update_fields)
    return row


def record_login_success(email: str, ip_address: str | None, device_fingerprint: str) -> None:
    key = staff_lock_key(email, ip_address, device_fingerprint)
    StaffLoginLockout.objects.filter(lock_key=key).delete()
