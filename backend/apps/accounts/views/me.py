import mimetypes

from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.permissions import IsAppUser
from apps.accounts.serializers.auth import AppUserPublicSerializer
from apps.verification.serializers import file_from_data_uri


class MePhotoPatchSerializer(serializers.Serializer):
    photo_uri = serializers.CharField()

    def validate_photo_uri(self, value):
        return file_from_data_uri(value, "avatar")


class MeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        user = AppUser.objects.select_related("provider_application").get(pk=request.user.pk)
        return Response(AppUserPublicSerializer(user, context={"request": request}).data)

    def patch(self, request):
        user = AppUser.objects.select_related("provider_application").get(pk=request.user.pk)
        if user.account_type == user.ACCOUNT_PROVIDER:
            return Response(
                {"detail": "Service providers update their photo from profile edit, which admin must verify."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = MePhotoPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.avatar = serializer.validated_data["photo_uri"]
        user.save(update_fields=["avatar"])
        return Response(AppUserPublicSerializer(user, context={"request": request}).data)


class MePhotoView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        if not request.user.avatar:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(request.user.avatar.name)
        return FileResponse(request.user.avatar.open("rb"), content_type=content_type or "application/octet-stream")
