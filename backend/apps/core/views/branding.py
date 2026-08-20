import mimetypes
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework import serializers

from apps.core.models import BrandingConfig
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.verification.serializers import file_from_data_uri


def ensure_default_signatory(config: BrandingConfig) -> BrandingConfig:
    if config.authorized_signatory:
        return config
    candidates = [
        Path(settings.MEDIA_ROOT) / "branding" / "authorized-signatory.png",
        Path(settings.BASE_DIR).parent / "apps" / "admin" / "public" / "id-card" / "authorized-signatory.png",
        Path(settings.BASE_DIR).parent / "apps" / "mobile" / "assets" / "id-card" / "authorized-signatory.png",
    ]
    for path in candidates:
        if path.is_file():
            with path.open("rb") as fh:
                config.authorized_signatory.save("authorized-signatory.png", File(fh), save=True)
            break
    return config


def signatory_absolute_uri(request) -> str | None:
    config = ensure_default_signatory(BrandingConfig.get_solo())
    if not config.authorized_signatory:
        return None
    return request.build_absolute_uri("/api/branding/signatory/")


class PublicSignatoryImageView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        config = ensure_default_signatory(BrandingConfig.get_solo())
        if not config.authorized_signatory:
            return HttpResponse(status=404)
        content_type, _ = mimetypes.guess_type(config.authorized_signatory.name)
        return FileResponse(
            config.authorized_signatory.open("rb"),
            content_type=content_type or "image/png",
        )


class StaffBrandingView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        config = ensure_default_signatory(BrandingConfig.get_solo())
        return Response(
            {
                "signatory_uri": (
                    request.build_absolute_uri("/api/branding/signatory/")
                    if config.authorized_signatory
                    else None
                ),
                "updated_at": config.updated_at,
            }
        )

    def post(self, request):
        uri = request.data.get("signatory_uri") or request.data.get("image_uri")
        if not uri:
            return Response({"detail": "Upload a signature image."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            content = file_from_data_uri(uri, "signatory")
        except serializers.ValidationError as exc:
            detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
            return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
        config = BrandingConfig.get_solo()
        if config.authorized_signatory:
            config.authorized_signatory.delete(save=False)
        config.authorized_signatory.save(content.name, content, save=True)
        return Response(
            {
                "signatory_uri": request.build_absolute_uri("/api/branding/signatory/"),
                "updated_at": config.updated_at,
            }
        )
