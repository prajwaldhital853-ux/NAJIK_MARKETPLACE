from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    consume_password_reset,
    issue_password_reset,
    normalize_phone,
)
from apps.accounts.throttles import PasswordResetRateThrottle


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw = serializer.validated_data["identifier"].strip()
        if "@" in raw:
            user = AppUser.objects.filter(email__iexact=raw.lower(), is_active=True).first()
        else:
            user = AppUser.objects.filter(phone=normalize_phone(raw), is_active=True).first()
        payload = {"detail": "If an account exists, reset instructions were sent."}
        if user is not None:
            token = issue_password_reset(user)
            if settings.DEBUG:
                payload["dev_reset"] = {"uid": str(user.id), "token": token}
        return Response(payload)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AppUser.objects.filter(pk=serializer.validated_data["uid"], is_active=True).first()
        if user is None or not consume_password_reset(user, serializer.validated_data["token"]):
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})
