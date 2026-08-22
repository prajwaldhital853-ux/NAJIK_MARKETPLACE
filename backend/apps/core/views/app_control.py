import mimetypes

from django.http import FileResponse, HttpResponse
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import HomeBanner
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.verification.serializers import file_from_data_uri


def home_banner_payload(request, banner: HomeBanner | None = None) -> dict:
    banner = banner or HomeBanner.get_solo()
    image_url = None
    if banner.image:
        stamp = int(banner.updated_at.timestamp()) if banner.updated_at else 0
        image_url = request.build_absolute_uri(f"/api/app-control/home-banner/image/?v={stamp}")
    return {
        "image_url": image_url,
        "updated_at": banner.updated_at,
    }


class PublicHomeBannerView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(home_banner_payload(request))


class PublicHomeBannerImageView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        banner = HomeBanner.get_solo()
        if not banner.image:
            return HttpResponse(status=404)
        content_type, _ = mimetypes.guess_type(banner.image.name)
        response = FileResponse(
            banner.image.open("rb"),
            content_type=content_type or "image/jpeg",
        )
        response["Cache-Control"] = "no-store, max-age=0"
        return response


class StaffHomeBannerView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(home_banner_payload(request))

    def post(self, request):
        banner = HomeBanner.get_solo()
        uri = request.data.get("image_uri") or request.data.get("banner_uri")
        if not uri:
            return Response({"detail": "Provide image_uri with a JPEG, PNG, or WebP image."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            content = file_from_data_uri(uri, "home_banner")
        except serializers.ValidationError as exc:
            detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
            return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
        if banner.image:
            banner.image.delete(save=False)
        banner.image.save(content.name, content, save=True)
        return Response(home_banner_payload(request, banner))

    def delete(self, request):
        banner = HomeBanner.get_solo()
        if banner.image:
            banner.image.delete(save=False)
            banner.image = None
            banner.save(update_fields=["image", "updated_at"])
        return Response(home_banner_payload(request, banner))
