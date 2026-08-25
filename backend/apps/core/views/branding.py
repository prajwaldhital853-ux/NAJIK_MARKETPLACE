import mimetypes
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.http import FileResponse, HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework import serializers

from apps.core.models import BrandingConfig
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import require_any_rbac_method
from apps.verification.serializers import file_from_data_uri


DEFAULT_EMERGENCY_PHONE = "01-5970123"
DEFAULT_EMERGENCY_EMAIL = "support@najik.com"
DEFAULT_WEBSITE = "www.najik.com"


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


def branding_payload(request, config: BrandingConfig | None = None) -> dict:
    config = ensure_default_signatory(config or BrandingConfig.get_solo())
    phone = (config.emergency_phone or "").strip() or DEFAULT_EMERGENCY_PHONE
    email = (config.emergency_email or "").strip() or DEFAULT_EMERGENCY_EMAIL
    website = (config.website or "").strip() or DEFAULT_WEBSITE
    signatory_uri = None
    if config.authorized_signatory:
        # Cache-bust so every seller card picks up admin signature uploads immediately.
        stamp = int(config.updated_at.timestamp()) if config.updated_at else 0
        signatory_uri = request.build_absolute_uri(f"/api/branding/signatory/?v={stamp}")
    return {
        "signatory_uri": signatory_uri,
        "emergency_phone": phone,
        "emergency_email": email,
        "website": website,
        "updated_at": config.updated_at,
    }


def signatory_absolute_uri(request) -> str | None:
    return branding_payload(request)["signatory_uri"]


def card_branding_fields(request) -> dict:
    """Live branding fields embedded on every seller ID card payload."""
    data = branding_payload(request)
    return {
        "signature_uri": data["signatory_uri"],
        "emergency_phone": data["emergency_phone"],
        "emergency_email": data["emergency_email"],
        "website": data["website"],
        "branding_updated_at": data["updated_at"],
    }


class PublicSignatoryImageView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        config = ensure_default_signatory(BrandingConfig.get_solo())
        if not config.authorized_signatory:
            return HttpResponse(status=404)
        content_type, _ = mimetypes.guess_type(config.authorized_signatory.name)
        response = FileResponse(
            config.authorized_signatory.open("rb"),
            content_type=content_type or "image/png",
        )
        # Always serve latest so all active cards refresh after admin upload.
        response["Cache-Control"] = "no-store, max-age=0"
        return response


class StaffBrandingView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(branding_payload(request))

    def post(self, request):
        require_any_rbac_method(
            request.user,
            ("kyc_verification", "PATCH"),
            ("settings", "PATCH"),
        )
        config = BrandingConfig.get_solo()
        changed = False

        uri = request.data.get("signatory_uri") or request.data.get("image_uri")
        if uri:
            try:
                content = file_from_data_uri(uri, "signatory")
            except serializers.ValidationError as exc:
                detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
                return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
            if config.authorized_signatory:
                config.authorized_signatory.delete(save=False)
            config.authorized_signatory.save(content.name, content, save=False)
            changed = True

        if "emergency_phone" in request.data:
            phone = str(request.data.get("emergency_phone") or "").strip()
            config.emergency_phone = phone or DEFAULT_EMERGENCY_PHONE
            changed = True
        if "emergency_email" in request.data:
            email = str(request.data.get("emergency_email") or "").strip()
            config.emergency_email = email or DEFAULT_EMERGENCY_EMAIL
            changed = True
        if "website" in request.data:
            website = str(request.data.get("website") or "").strip().replace("https://", "").replace("http://", "")
            config.website = website or DEFAULT_WEBSITE
            changed = True

        if not changed:
            return Response(
                {"detail": "Provide a signature image and/or emergency contact fields."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        config.save()
        return Response(branding_payload(request, config))
