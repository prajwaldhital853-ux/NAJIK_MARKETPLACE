from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from apps.accounts.models import OneTimePassword

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
STUB_CODE = "1234"


def request_otp(identifier: str, purpose: str) -> OneTimePassword:
    OneTimePassword.objects.filter(
        identifier=identifier,
        purpose=purpose,
        consumed_at__isnull=True,
    ).delete()
    code = STUB_CODE if getattr(settings, "OTP_STUB", True) else STUB_CODE
    return OneTimePassword.objects.create(
        identifier=identifier,
        purpose=purpose,
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )


def verify_otp(identifier: str, purpose: str, code: str) -> bool:
    row = (
        OneTimePassword.objects.filter(
            identifier=identifier,
            purpose=purpose,
            consumed_at__isnull=True,
        )
        .order_by("-created_at")
        .first()
    )
    if row is None:
        return False
    if row.expires_at < timezone.now():
        return False
    if row.attempts >= OTP_MAX_ATTEMPTS:
        return False
    row.attempts += 1
    if getattr(settings, "OTP_STUB", True):
        ok = code.strip() == STUB_CODE
    else:
        ok = check_password(code.strip(), row.code_hash)
    if not ok:
        row.save(update_fields=["attempts"])
        return False
    row.consumed_at = timezone.now()
    row.save(update_fields=["attempts", "consumed_at"])
    return True
