"""Staff TOTP setup and login verification endpoints."""

from django.core.cache import cache
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.models import StaffUser
from apps.staff.serializers.auth import StaffPublicSerializer, StaffTokenSerializer
from apps.staff.totp import (
    MAX_TOTP_VERIFY_ATTEMPTS,
    PRE_AUTH_PURPOSE_LOGIN,
    PRE_AUTH_PURPOSE_RECOVER,
    PRE_AUTH_PURPOSE_SETUP,
    admin_totp_required,
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_totp_secret,
    issue_pre_auth_token,
    mark_totp_confirmed,
    provisioning_uri,
    qr_code_data_url,
    totp_issuer,
    verify_pre_auth_token,
    verify_totp_code,
)
from apps.staff.totp_backup import consume_backup_code_for_recovery, delete_all_backup_codes, issue_backup_codes, unused_backup_code_count

_SETUP_PURPOSES = {PRE_AUTH_PURPOSE_SETUP, PRE_AUTH_PURPOSE_RECOVER}


def _fail(message: str, status: int, code: str | None = None, extra: dict | None = None):
    payload = {"error": message, "detail": message}
    if code:
        payload["code"] = code
    if extra:
        payload.update(extra)
    return Response(payload, status=status)


def _attempt_key(pre_auth_token: str) -> str:
    return f"totp-attempts:{pre_auth_token[:48]}"


def _register_totp_failure(pre_auth_token: str) -> int:
    key = _attempt_key(pre_auth_token)
    attempts = int(cache.get(key, 0)) + 1
    cache.set(key, attempts, timeout=300)
    return attempts


def _clear_totp_attempts(pre_auth_token: str) -> None:
    cache.delete(_attempt_key(pre_auth_token))


def _login_payload(user, *, backup_codes: list[str] | None = None):
    payload = {
        **StaffTokenSerializer.for_user(user, totp_verified=True),
        "user": StaffPublicSerializer(user).data,
        "mustChangePassword": bool(user.must_change_password),
    }
    if backup_codes:
        payload["backupCodes"] = backup_codes
    return payload


def _resolve_pre_auth_user(token: str, purpose: str):
    user_id = verify_pre_auth_token(token, purpose)
    user = StaffUser.objects.filter(pk=user_id, is_active=True).first()
    if not user:
        raise ValueError("Account unavailable. Sign in again.")
    return user


def _resolve_setup_pre_auth_user(token: str):
    for purpose in _SETUP_PURPOSES:
        try:
            return _resolve_pre_auth_user(token, purpose), purpose
        except ValueError:
            continue
    raise ValueError("Invalid verification session. Sign in again.")


def _begin_totp_enrollment(user) -> None:
    secret = generate_totp_secret()
    user.totp_secret_encrypted = encrypt_totp_secret(secret)
    user.totp_enabled = False
    user.totp_confirmed_at = None
    user.save(update_fields=["totp_secret_encrypted", "totp_enabled", "totp_confirmed_at"])


def _setup_response(user):
    secret = decrypt_totp_secret(user.totp_secret_encrypted)
    uri = provisioning_uri(user, secret)
    return {
        "otpauthUrl": uri,
        "qrCodeDataUrl": qr_code_data_url(uri),
        "secret": secret,
        "issuer": totp_issuer(),
    }


class TotpSetupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    allow_without_totp = True

    def post(self, request):
        pre_auth = str(request.data.get("preAuthToken") or "").strip()
        if not pre_auth:
            return _fail("Sign in or provide a valid setup session.", 401)
        try:
            user, _purpose = _resolve_setup_pre_auth_user(pre_auth)
        except ValueError as exc:
            return _fail(str(exc), 400, "pre_auth_invalid")
        if not decrypt_totp_secret(user.totp_secret_encrypted):
            _begin_totp_enrollment(user)
        return Response(_setup_response(user))


class TotpConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    allow_without_totp = True

    def post(self, request):
        pre_auth = str(request.data.get("preAuthToken") or "").strip()
        code = str(request.data.get("code") or "").strip()
        if not code:
            return _fail("Enter the 6-digit code from your authenticator app.", 400)
        if not pre_auth:
            return _fail("Sign in or provide a valid setup session.", 401)
        try:
            user, purpose = _resolve_setup_pre_auth_user(pre_auth)
        except ValueError as exc:
            return _fail(str(exc), 400, "pre_auth_invalid")
        if not decrypt_totp_secret(user.totp_secret_encrypted):
            return _fail("Start setup again to generate a new QR code.", 400)
        if not verify_totp_code(user, code):
            attempts = _register_totp_failure(pre_auth)
            remaining = max(0, MAX_TOTP_VERIFY_ATTEMPTS - attempts)
            if remaining <= 0:
                return _fail("Too many failed attempts. Sign in again.", 429, "totp_locked")
            return _fail(
                "Incorrect code. Check the app time and try again.",
                400,
                "invalid_totp",
                {"attemptsRemaining": remaining},
            )
        _clear_totp_attempts(pre_auth)
        is_first_issue = not user.totp_backup_issued
        is_recovery = purpose == PRE_AUTH_PURPOSE_RECOVER
        mark_totp_confirmed(user)
        backup_codes: list[str] = []
        if is_first_issue or is_recovery:
            backup_codes = issue_backup_codes(user)
            if is_first_issue:
                user.totp_backup_issued = True
                user.save(update_fields=["totp_backup_issued"])
        return Response(_login_payload(user, backup_codes=backup_codes or None))


class TotpRecoverView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    allow_without_totp = True

    def post(self, request):
        pre_auth = str(request.data.get("preAuthToken") or "").strip()
        backup_code = str(request.data.get("backupCode") or "").strip()
        if not pre_auth or not backup_code:
            return _fail("Sign-in session and backup code are required.", 400)
        try:
            user = _resolve_pre_auth_user(pre_auth, PRE_AUTH_PURPOSE_LOGIN)
        except ValueError as exc:
            return _fail(str(exc), 400, "pre_auth_invalid")
        if not user.totp_enabled:
            return _fail("Two-factor authentication is not enabled for this account.", 400)
        if not consume_backup_code_for_recovery(user, backup_code):
            attempts = _register_totp_failure(pre_auth)
            remaining = max(0, MAX_TOTP_VERIFY_ATTEMPTS - attempts)
            if remaining <= 0:
                return _fail("Too many failed attempts. Sign in again.", 429, "totp_locked")
            return _fail("Incorrect backup code.", 400, "invalid_backup_code", {"attemptsRemaining": remaining})
        _clear_totp_attempts(pre_auth)
        _begin_totp_enrollment(user)
        recover_token = issue_pre_auth_token(user.pk, PRE_AUTH_PURPOSE_RECOVER)
        return Response(
            {
                "preAuthToken": recover_token,
                "message": "Backup code accepted. Scan the new QR code in your authenticator app.",
                **_setup_response(user),
            }
        )


class TotpVerifyLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    allow_without_totp = True

    def post(self, request):
        pre_auth = str(request.data.get("preAuthToken") or "").strip()
        code = str(request.data.get("code") or "").strip()
        if not pre_auth or not code:
            return _fail("Verification session and 6-digit code are required.", 400)
        try:
            user = _resolve_pre_auth_user(pre_auth, PRE_AUTH_PURPOSE_LOGIN)
        except ValueError as exc:
            return _fail(str(exc), 400, "pre_auth_invalid")
        if not user.totp_enabled:
            return _fail("Two-factor authentication is not enabled for this account.", 400)
        if not verify_totp_code(user, code):
            attempts = _register_totp_failure(pre_auth)
            remaining = max(0, MAX_TOTP_VERIFY_ATTEMPTS - attempts)
            if remaining <= 0:
                return _fail("Too many failed attempts. Sign in again.", 429, "totp_locked")
            return _fail(
                "Incorrect code. Open Google Authenticator and try the current code.",
                400,
                "invalid_totp",
                {"attemptsRemaining": remaining},
            )
        _clear_totp_attempts(pre_auth)
        return Response(_login_payload(user))


class TotpStatusView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsAuthenticated]
    allow_without_totp = True

    def get(self, request):
        user = request.user
        return Response(
            {
                "totpEnabled": bool(user.totp_enabled),
                "totpRequired": admin_totp_required(user),
                "confirmedAt": user.totp_confirmed_at.isoformat() if user.totp_confirmed_at else None,
                "backupCodesRemaining": unused_backup_code_count(user),
            }
        )


class TotpDisableView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsAuthenticated]
    allow_without_totp = True

    def post(self, request):
        user = request.user
        if admin_totp_required(user):
            return _fail("Two-factor authentication is required for all admin accounts.", 403)
        code = str(request.data.get("code") or "").strip()
        if not user.totp_enabled:
            return Response({"totpEnabled": False})
        if not verify_totp_code(user, code):
            return _fail("Incorrect code.", 400, "invalid_totp")
        user.totp_secret_encrypted = ""
        user.totp_enabled = False
        user.totp_confirmed_at = None
        user.totp_backup_issued = False
        user.save(update_fields=["totp_secret_encrypted", "totp_enabled", "totp_confirmed_at", "totp_backup_issued"])
        delete_all_backup_codes(user)
        return Response({"totpEnabled": False, "message": "Two-factor authentication disabled."})


def build_pre_auth_login_response(user):
    return {
        "requires2FA": True,
        "preAuthToken": issue_pre_auth_token(user.pk, PRE_AUTH_PURPOSE_LOGIN),
        "user": StaffPublicSerializer(user).data,
        "mustChangePassword": bool(user.must_change_password),
    }


def build_pre_auth_setup_response(user):
    return {
        "requires2FASetup": True,
        "preAuthToken": issue_pre_auth_token(user.pk, PRE_AUTH_PURPOSE_SETUP),
        "user": StaffPublicSerializer(user).data,
        "mustChangePassword": bool(user.must_change_password),
    }
