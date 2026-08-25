import json
import logging
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import AppTokenSerializer, AppUserPublicSerializer, inactive_auth_error, wrong_role_payload
from apps.accounts.throttles import GoogleAuthRateThrottle


logger = logging.getLogger(__name__)


def _google_payload(id_token: str) -> tuple[dict | None, str | None]:
    client_ids = getattr(settings, "GOOGLE_CLIENT_IDS", [])
    if not client_ids:
        return None, "Google client IDs are not configured."
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        return None, "Google auth libraries are missing on the server."
    last_exc = None
    for client_id in client_ids:
        try:
            payload = google_id_token.verify_oauth2_token(
                id_token,
                google_requests.Request(),
                audience=client_id,
            )
            return payload, None
        except Exception as exc:
            last_exc = exc
            continue
    try:
        payload = google_id_token.verify_oauth2_token(id_token, google_requests.Request())
        aud = payload.get("aud")
        if aud and aud not in client_ids:
            return None, "Google client ID mismatch. Check GOOGLE_CLIENT_IDS."
        return payload, None
    except Exception as exc:
        logger.exception("Google id_token verify failed")
        return None, f"Could not verify Google account: {last_exc or exc}"


def _redirect_candidates(redirect_uri: str) -> list[str]:
    raw = (redirect_uri or "").strip() or getattr(settings, "GOOGLE_REDIRECT_URI", "") or ""
    candidates = []
    for value in (raw, raw.rstrip("/"), f"{raw.rstrip('/')}/", getattr(settings, "GOOGLE_REDIRECT_URI", "")):
        value = (value or "").strip()
        if value and value not in candidates:
            candidates.append(value)
    return candidates or [raw]


def _exchange_google_code(code: str, redirect_uri: str) -> tuple[dict | None, str | None]:
    client_ids = getattr(settings, "GOOGLE_CLIENT_IDS", [])
    secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "") or ""
    if not client_ids or not secret:
        return None, "Google sign-in is not configured on the server."

    last_err = "Google rejected the sign-in code. Try again."
    for client_id in client_ids:
        for redirect in _redirect_candidates(redirect_uri):
            body = urlencode(
                {
                    "code": code,
                    "client_id": client_id,
                    "client_secret": secret,
                    "redirect_uri": redirect,
                    "grant_type": "authorization_code",
                }
            ).encode()
            req = Request(
                "https://oauth2.googleapis.com/token",
                data=body,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            try:
                with urlopen(req, timeout=15) as res:
                    data = json.loads(res.read().decode())
            except HTTPError as exc:
                detail = exc.read().decode(errors="replace")
                logger.warning("Google token exchange HTTP %s (%s): %s", exc.code, redirect, detail)
                try:
                    parsed = json.loads(detail)
                    err = parsed.get("error_description") or parsed.get("error")
                except Exception:
                    err = detail
                last_err = f"Google rejected the sign-in code. {err or 'Try again.'}"
                # invalid_grant often means code already used — stop trying variants
                if "invalid_grant" in (err or "").lower() or "invalid_grant" in detail.lower():
                    return None, last_err
                continue
            except Exception:
                logger.exception("Google token exchange failed")
                last_err = "Could not reach Google to finish sign-in."
                continue

            token = (data.get("id_token") or "").strip()
            if not token:
                last_err = "Google did not return an account token."
                continue
            payload, err = _google_payload(token)
            if payload:
                return payload, None
            last_err = err or "Could not verify Google account."
    return None, last_err


def _session_for_google_user(payload: dict, account_type: str, request):
    from apps.accounts.legal import legal_accepted_from, require_legal_acceptance, stamp_legal_acceptance

    sub = payload.get("sub")
    email = (payload.get("email") or "").lower() or None
    email_verified = bool(payload.get("email_verified"))
    name = payload.get("name") or ""
    if not sub:
        return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

    user = AppUser.objects.filter(google_sub=sub).first()
    if user is None and email:
        user = AppUser.objects.filter(email__iexact=email).first()
        if user and user.google_sub and user.google_sub != sub:
            return Response({"detail": "Unable to sign in."}, status=status.HTTP_400_BAD_REQUEST)
    if user is None:
        require_legal_acceptance(request.data)
        user = AppUser(
            email=email,
            username=email or f"google_{sub}",
            full_name=name,
            account_type=account_type,
            google_sub=sub,
            email_verified=email_verified,
        )
        if not email and not user.phone:
            return Response({"detail": "Google account has no email."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_unusable_password()
        user.save()
        stamp_legal_acceptance(user, request.data)
    else:
        if user.account_type != account_type:
            return Response(wrong_role_payload(user.account_type), status=status.HTTP_409_CONFLICT)
        if not user.google_sub:
            user.google_sub = sub
        if email_verified:
            user.email_verified = True
        if email and not user.email:
            user.email = email
        user.save()
        if legal_accepted_from(request.data):
            stamp_legal_acceptance(user, request.data)
    if not user.is_active:
        return Response(
            {"detail": inactive_auth_error(user)},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
    tokens = AppTokenSerializer.for_user(user)
    return Response({"user": AppUserPublicSerializer(user, context={"request": request}).data, **tokens})


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GoogleAuthRateThrottle]

    def post(self, request):
        account_type = request.data.get("account_type") or AppUser.ACCOUNT_USER
        if account_type not in (AppUser.ACCOUNT_USER, AppUser.ACCOUNT_PROVIDER):
            return Response({"detail": "Invalid account type."}, status=status.HTTP_400_BAD_REQUEST)
        token = (request.data.get("id_token") or "").strip()
        code = (request.data.get("code") or "").strip()
        redirect_uri = (request.data.get("redirect_uri") or "").strip() or getattr(settings, "GOOGLE_REDIRECT_URI", "")
        if code:
            payload, err = _exchange_google_code(code, redirect_uri)
            if payload is None:
                return Response(
                    {"detail": err or "Google sign-in could not be completed. Try again."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            return _session_for_google_user(payload, account_type, request)
        if token:
            payload, err = _google_payload(token)
            if payload is None:
                return Response(
                    {"detail": err or "Google sign-in is not configured."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return _session_for_google_user(payload, account_type, request)
        return Response({"detail": "Missing Google sign-in code."}, status=status.HTTP_400_BAD_REQUEST)


class GoogleAuthCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        code = (request.query_params.get("code") or "").strip()
        error = (request.query_params.get("error") or "").strip()
        if code or error:
            return Response(
                "<!DOCTYPE html><html><body style='font-family:sans-serif;text-align:center;padding:48px'>"
                "<p>Sign-in complete. You can return to the NAJIK app.</p></body></html>",
                content_type="text/html",
            )
        return Response({"ok": True})
