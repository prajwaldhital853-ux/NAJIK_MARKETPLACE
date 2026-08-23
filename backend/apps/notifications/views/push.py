from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.notifications.models.push_device import PushDevice


class PushTokenRegisterView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        if not token or (not token.startswith("ExponentPushToken[") and not token.startswith("ExpoPushToken[")):
            return Response({"detail": "Valid Expo push token required."}, status=status.HTTP_400_BAD_REQUEST)

        platform = (request.data.get("platform") or PushDevice.PLATFORM_ANDROID).strip().lower()
        if platform not in {PushDevice.PLATFORM_ANDROID, PushDevice.PLATFORM_IOS}:
            platform = PushDevice.PLATFORM_ANDROID

        device_name = (request.data.get("device_name") or "")[:120]

        device, _ = PushDevice.objects.update_or_create(
            token=token,
            defaults={
                "user": request.user,
                "platform": platform,
                "device_name": device_name,
                "is_active": True,
            },
        )
        return Response({"ok": True, "id": str(device.id)})


class PushTokenUnregisterView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        if token:
            PushDevice.objects.filter(user=request.user, token=token).update(is_active=False)
        else:
            PushDevice.objects.filter(user=request.user).update(is_active=False)
        return Response({"ok": True})
