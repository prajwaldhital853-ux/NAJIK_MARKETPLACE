from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import AppTokenSerializer, AppUserPublicSerializer, inactive_auth_error
from apps.accounts.throttles import GoogleAuthRateThrottle


def _google_payload(id_token: str) -> dict | None:
    client_ids = getattr(settings, "GOOGLE_CLIENT_IDS", [])
    if not client_ids:
        return None
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        return None
    try:
        return google_id_token.verify_oauth2_token(id_token, google_requests.Request())
    except Exception:
        return None


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GoogleAuthRateThrottle]

    def post(self, request):
        token = (request.data.get("id_token") or "").strip()
        account_type = request.data.get("account_type") or AppUser.ACCOUNT_USER
        if account_type not in (AppUser.ACCOUNT_USER, AppUser.ACCOUNT_PROVIDER):
            return Response({"detail": "Invalid account type."}, status=status.HTTP_400_BAD_REQUEST)
        if not token:
            return Response({"detail": "Missing id_token."}, status=status.HTTP_400_BAD_REQUEST)
        payload = _google_payload(token)
        if payload is None:
            return Response(
                {"detail": "Google sign-in is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
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
        else:
            if user.account_type != account_type and not user.google_sub:
                role = "buyer" if user.account_type == AppUser.ACCOUNT_USER else "service provider"
                return Response(
                    {
                        "detail": (
                            f"This email is already registered as a {role} account. "
                            "The same phone or email cannot be used for both a buyer and a service provider. "
                            "Sign in to that account, or use a different Google account."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.google_sub:
                user.google_sub = sub
            if email_verified:
                user.email_verified = True
            if email and not user.email:
                user.email = email
            user.save()
        if not user.is_active:
            return Response(
                {"detail": inactive_auth_error(user)},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        tokens = AppTokenSerializer.for_user(user)
        return Response({"user": AppUserPublicSerializer(user, context={"request": request}).data, **tokens})
