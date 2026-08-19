from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.lockout import (
    LoginLocked,
    assert_not_locked,
    lockout_remaining,
    normalize_identifier,
    record_failure,
    record_success,
)
from apps.accounts.serializers.auth import (
    BLOCKED_AUTH_ERROR,
    DEACTIVATED_AUTH_ERROR,
    AppTokenSerializer,
    AppUserPublicSerializer,
    LoginSerializer,
)
from apps.accounts.throttles import LoginRateThrottle


def _login_error_detail(errors) -> str:
    if isinstance(errors, dict):
        for key in ("non_field_errors", "detail", "identifier", "password"):
            value = errors.get(key)
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str) and value:
                return value
        for value in errors.values():
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str) and value:
                return value
    return "Invalid credentials."


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        raw = str(request.data.get("identifier") or "")
        key = normalize_identifier(raw)
        if key:
            try:
                assert_not_locked(key)
            except LoginLocked as exc:
                return Response(exc.detail, status=exc.status_code)
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            detail = _login_error_detail(serializer.errors)
            paused = detail in {BLOCKED_AUTH_ERROR, DEACTIVATED_AUTH_ERROR}
            if key and not paused:
                row = record_failure(key)
                remaining = lockout_remaining(row)
                if remaining:
                    return Response(
                        {
                            "detail": f"Too many failed sign-in attempts. Try again in {remaining} seconds.",
                            "retry_after": remaining,
                        },
                        status=status.HTTP_429_TOO_MANY_REQUESTS,
                    )
            return Response({"detail": detail}, status=status.HTTP_401_UNAUTHORIZED)
        user = serializer.validated_data["user"]
        record_success(key or str(user.id))
        tokens = AppTokenSerializer.for_user(user)
        user = type(user).objects.select_related("provider_application").get(pk=user.pk)
        return Response({"user": AppUserPublicSerializer(user, context={"request": request}).data, **tokens})
