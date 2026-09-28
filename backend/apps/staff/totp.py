"""TOTP (Google Authenticator–compatible) helpers for NAJIK admin 2FA."""

from __future__ import annotations

import base64
import hashlib
import io

import pyotp
import qrcode
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils import timezone

PRE_AUTH_MAX_AGE_SECONDS = 300
PRE_AUTH_PURPOSE_LOGIN = "2fa_login"
PRE_AUTH_PURPOSE_SETUP = "2fa_setup"
PRE_AUTH_PURPOSE_RECOVER = "2fa_recover"
MAX_TOTP_VERIFY_ATTEMPTS = 5


def admin_totp_required(user) -> bool:
    if not user:
        return False
    return bool(getattr(settings, "ADMIN_REQUIRE_TOTP", True))


def totp_issuer() -> str:
    return getattr(settings, "ADMIN_TOTP_ISSUER", "NAJIK Admin")


def _jwt_payload(request) -> dict:
    token = getattr(request, "auth", None)
    if token is None:
        return {}
    payload = getattr(token, "payload", None)
    if isinstance(payload, dict):
        return payload
    if hasattr(token, "get"):
        return dict(token)
    return {}


def evaluate_totp_access(user, request) -> tuple[str | None, str]:
    """Return (error_code, message) when admin 2FA is not satisfied."""
    if not user or not getattr(user, "is_authenticated", False):
        return None, ""
    if admin_totp_required(user) and not getattr(user, "totp_enabled", False):
        return "requires_2fa_setup", "Two-factor authentication setup is required before using the admin panel."
    if getattr(user, "totp_enabled", False) and not _jwt_payload(request).get("totp_verified"):
        return "requires_2fa", "Sign in again with your authenticator code."
    return None, ""


def _fernet() -> Fernet:
    secret = (getattr(settings, "TOTP_ENCRYPTION_KEY", "") or settings.SECRET_KEY).encode()
    digest = hashlib.sha256(secret).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_totp_secret(raw_secret: str) -> str:
    return _fernet().encrypt(raw_secret.encode()).decode()


def decrypt_totp_secret(encrypted: str) -> str:
    if not encrypted:
        return ""
    try:
        return _fernet().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        return ""


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(user, secret: str) -> str:
    label = (user.email or f"staff-{user.pk}").strip()
    return pyotp.TOTP(secret).provisioning_uri(name=label, issuer_name=totp_issuer())


def qr_code_data_url(provisioning_url: str) -> str:
    image = qrcode.make(provisioning_url, box_size=6, border=2)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def verify_totp_code(user, code: str) -> bool:
    secret = decrypt_totp_secret(getattr(user, "totp_secret_encrypted", "") or "")
    if not secret:
        return False
    normalized = (code or "").strip().replace(" ", "")
    if not normalized.isdigit() or len(normalized) != 6:
        return False
    return bool(pyotp.TOTP(secret).verify(normalized, valid_window=1))


def issue_pre_auth_token(user_id, purpose: str) -> str:
    signer = TimestampSigner(salt="najik-admin-pre-auth")
    return signer.sign(f"{user_id}:{purpose}")


def verify_pre_auth_token(token: str, purpose: str) -> str:
    signer = TimestampSigner(salt="najik-admin-pre-auth")
    try:
        unsigned = signer.unsign(token, max_age=PRE_AUTH_MAX_AGE_SECONDS)
    except SignatureExpired as exc:
        raise ValueError("Verification session expired. Sign in again.") from exc
    except BadSignature as exc:
        raise ValueError("Invalid verification session. Sign in again.") from exc
    user_id_str, tok_purpose = unsigned.split(":", 1)
    if tok_purpose != purpose:
        raise ValueError("Invalid verification session. Sign in again.")
    return user_id_str


def mark_totp_confirmed(user) -> None:
    user.totp_enabled = True
    user.totp_confirmed_at = timezone.now()
    user.save(update_fields=["totp_enabled", "totp_confirmed_at"])
