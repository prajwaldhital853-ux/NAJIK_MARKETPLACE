import base64
import re
import uuid

from django.core.files.base import ContentFile
from rest_framework import serializers

from apps.verification.models import ProviderApplication

MAX_IMAGE_BYTES = 2 * 1024 * 1024
DATA_URI = re.compile(r"^data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$", re.I)


def file_from_data_uri(value: str, prefix: str) -> ContentFile:
    match = DATA_URI.match((value or "").strip())
    if not match:
        raise serializers.ValidationError("Upload a JPEG, PNG, or WebP image.")
    try:
        raw = base64.b64decode(re.sub(r"\s+", "", match.group(2)), validate=True)
    except Exception as exc:
        raise serializers.ValidationError("Invalid image data.") from exc
    if len(raw) > MAX_IMAGE_BYTES:
        raise serializers.ValidationError("Image must be 2 MB or smaller.")
    ext = match.group(1).lower().replace("jpg", "jpeg")
    return ContentFile(raw, name=f"{prefix}_{uuid.uuid4().hex[:8]}.{ext}")


class ProviderApplicationSerializer(serializers.ModelSerializer):
    nagrita_uri = serializers.SerializerMethodField()
    nagrita_back_uri = serializers.SerializerMethodField()
    photo_uri = serializers.SerializerMethodField()
    nation_card_uri = serializers.SerializerMethodField()
    other_document_uri = serializers.SerializerMethodField()
    pending_photo_uri = serializers.SerializerMethodField()
    pending_nagrita_uri = serializers.SerializerMethodField()
    pending_nagrita_back_uri = serializers.SerializerMethodField()
    has_pending_edit = serializers.SerializerMethodField()
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True, allow_null=True)
    owner_phone = serializers.CharField(source="owner.phone", read_only=True, allow_null=True, allow_blank=True)
    phone_verified = serializers.BooleanField(source="owner.phone_verified", read_only=True)
    email_verified = serializers.BooleanField(source="owner.email_verified", read_only=True)

    class Meta:
        model = ProviderApplication
        fields = (
            "id",
            "full_name",
            "address",
            "contact",
            "phone",
            "email",
            "service_type",
            "status",
            "created_at",
            "reviewed_at",
            "owner_id",
            "owner_email",
            "owner_phone",
            "phone_verified",
            "email_verified",
            "nagrita_uri",
            "nagrita_back_uri",
            "photo_uri",
            "nation_card_uri",
            "other_document_uri",
            "profile_data",
            "rejection_note",
            "pending_photo_uri",
            "pending_nagrita_uri",
            "pending_nagrita_back_uri",
            "has_pending_edit",
            "pending_edit",
        )
        read_only_fields = fields

    def get_nagrita_uri(self, obj):
        return self._file_uri(obj, "nagrita")

    def get_nagrita_back_uri(self, obj):
        if not obj.nagrita_back:
            return None
        return self._file_uri(obj, "nagrita_back")

    def get_photo_uri(self, obj):
        return self._file_uri(obj, "photo")

    def get_nation_card_uri(self, obj):
        if not obj.nation_card:
            return None
        return self._file_uri(obj, "nation_card")

    def get_other_document_uri(self, obj):
        if not obj.other_document:
            return None
        return self._file_uri(obj, "other_document")

    def get_pending_photo_uri(self, obj):
        if not obj.pending_photo:
            return None
        return self._file_uri(obj, "pending_photo")

    def get_pending_nagrita_uri(self, obj):
        if not obj.pending_nagrita:
            return None
        return self._file_uri(obj, "pending_nagrita")

    def get_pending_nagrita_back_uri(self, obj):
        if not obj.pending_nagrita_back:
            return None
        return self._file_uri(obj, "pending_nagrita_back")

    def get_has_pending_edit(self, obj):
        return obj.has_pending_profile_edit()

    def _file_uri(self, obj, kind):
        request = self.context.get("request")
        if not request:
            return None
        if request.path.startswith("/api/admin/"):
            return request.build_absolute_uri(f"/api/admin/verification/applications/{obj.id}/file/{kind}/")
        return request.build_absolute_uri(f"/api/verification/applications/me/file/{kind}/")


class ProviderApplicationCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    address = serializers.CharField(max_length=255)
    contact = serializers.CharField(max_length=80, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=15)
    email = serializers.EmailField()
    service_type = serializers.CharField(max_length=40)
    nagrita_uri = serializers.CharField()
    nagrita_back_uri = serializers.CharField()
    photo_uri = serializers.CharField()
    nation_card_uri = serializers.CharField()
    other_document_uri = serializers.CharField(required=False, allow_blank=True)

    def validate_nagrita_uri(self, value):
        return file_from_data_uri(value, "nagrita")

    def validate_nagrita_back_uri(self, value):
        return file_from_data_uri(value, "nagrita_back")

    def validate_photo_uri(self, value):
        return file_from_data_uri(value, "photo")

    def validate_nation_card_uri(self, value):
        return file_from_data_uri(value, "nation_card")

    def validate_other_document_uri(self, value):
        if not (value or "").strip():
            return None
        return file_from_data_uri(value, "other_document")

    def create(self, validated_data):
        nagrita = validated_data.pop("nagrita_uri")
        nagrita_back = validated_data.pop("nagrita_back_uri")
        photo = validated_data.pop("photo_uri")
        nation_card = validated_data.pop("nation_card_uri")
        other_document = validated_data.pop("other_document_uri", None)
        app = ProviderApplication(
            **validated_data,
            nagrita=nagrita,
            nagrita_back=nagrita_back,
            photo=photo,
            nation_card=nation_card,
        )
        if other_document:
            app.other_document = other_document
        app.save()
        return app


class ProviderApplicationStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(
            ProviderApplication.STATUS_PENDING,
            ProviderApplication.STATUS_VERIFIED,
            ProviderApplication.STATUS_REJECTED,
        )
    )
    rejection_note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class ProviderProfileEditSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False)
    address = serializers.CharField(max_length=255, required=False)
    contact = serializers.CharField(max_length=80, required=False, allow_blank=True)
    service_type = serializers.CharField(max_length=40, required=False)
    nagrita_uri = serializers.CharField(required=False, allow_blank=True)
    nagrita_back_uri = serializers.CharField(required=False, allow_blank=True)
    photo_uri = serializers.CharField(required=False, allow_blank=True)
    nation_card_uri = serializers.CharField(required=False, allow_blank=True)
    other_document_uri = serializers.CharField(required=False, allow_blank=True)
    profile_data = serializers.DictField(required=False)

    def validate_nagrita_uri(self, value):
        if not value:
            return None
        return file_from_data_uri(value, "nagrita")

    def validate_nagrita_back_uri(self, value):
        if not value:
            return None
        return file_from_data_uri(value, "nagrita_back")

    def validate_photo_uri(self, value):
        if not value:
            return None
        return file_from_data_uri(value, "photo")

    def validate_nation_card_uri(self, value):
        if not value:
            return None
        return file_from_data_uri(value, "nation_card")

    def validate_other_document_uri(self, value):
        if not value:
            return None
        return file_from_data_uri(value, "other_document")


def clear_pending_profile(app: ProviderApplication):
    app.pending_edit = {}
    app.pending_nagrita = ""
    app.pending_nagrita_back = ""
    app.pending_photo = ""
    app.save(update_fields=["pending_edit", "pending_nagrita", "pending_nagrita_back", "pending_photo"])


def apply_pending_profile(app: ProviderApplication):
    edit = app.pending_edit or {}
    for field in ("full_name", "address", "contact", "service_type"):
        if field in edit and edit[field] is not None:
            setattr(app, field, edit[field])
    if "profile_data" in edit:
        app.profile_data = edit.get("profile_data") or {}
    if app.pending_nagrita:
        app.nagrita = app.pending_nagrita
        app.pending_nagrita = ""
    if app.pending_nagrita_back:
        app.nagrita_back = app.pending_nagrita_back
        app.pending_nagrita_back = ""
    if app.pending_photo:
        app.photo = app.pending_photo
        app.pending_photo = ""
    app.pending_edit = {}
    app.save()
    if app.full_name and app.owner.full_name != app.full_name:
        app.owner.full_name = app.full_name
        app.owner.save(update_fields=["full_name"])
    if app.address and getattr(app.owner, "address", None) != app.address:
        app.owner.address = app.address
        app.owner.save(update_fields=["address"])
    return app


def provider_id_card_payload(card, request=None, *, for_staff=False):
    from apps.core.views.branding import card_branding_fields

    owner = card.owner
    app = getattr(owner, "provider_application", None)
    photo_uri = None
    if request and app and app.photo:
        if for_staff:
            photo_uri = request.build_absolute_uri(
                f"/api/admin/verification/applications/{app.id}/file/photo/"
            )
        else:
            photo_uri = request.build_absolute_uri("/api/verification/applications/me/file/photo/")
    verify_path = f"/api/cards/verify/{card.verify_token}/"
    verify_url = request.build_absolute_uri(verify_path) if request else verify_path
    joined = None
    if app and app.created_at:
        joined = app.created_at
    elif getattr(owner, "date_joined", None):
        joined = owner.date_joined
    branding = card_branding_fields(request) if request else {
        "signature_uri": None,
        "emergency_phone": "01-5970123",
        "emergency_email": "support@najik.com",
        "website": "www.najik.com",
        "branding_updated_at": None,
    }
    payload = {
        "id": str(card.id),
        "card_code": card.card_code,
        "access_status": card.access_status,
        "can_download": card.can_download,
        "requested_at": card.requested_at,
        "approved_at": card.approved_at,
        "staff_note": card.staff_note,
        "full_name": (app.full_name if app else None) or owner.full_name or "",
        "role_label": "SERVICE PROVIDER",
        "category": (app.service_type if app else "") or "",
        "phone": (app.phone if app else None) or owner.phone or "",
        "email": (app.email if app else None) or owner.email or "",
        "joined_on": joined,
        "kyc_status": app.status if app else "none",
        "is_verified": bool(app and app.status == "verified"),
        "photo_uri": photo_uri,
        "verify_url": verify_url,
        "public_qr_uri": (
            request.build_absolute_uri(f"/api/cards/verify/{card.verify_token}/qr/") if request else None
        ),
        "created_at": card.created_at,
        **branding,
    }
    if request and not for_staff:
        payload["qr_uri"] = request.build_absolute_uri("/api/cards/me/qr/")
    return payload


def staff_id_card_payload(card, request=None):
    data = provider_id_card_payload(card, request=request, for_staff=True)
    owner = card.owner
    app = getattr(owner, "provider_application", None)
    data["owner_id"] = str(card.owner_id)
    data["owner_name"] = owner.full_name or ""
    data["address"] = (app.address if app else None) or getattr(owner, "address", "") or ""
    data["contact"] = (app.contact if app else "") or ""
    data["application_id"] = str(app.id) if app else None
    data["profile_data"] = (app.profile_data if app else {}) or {}
    data["rejection_note"] = (app.rejection_note if app else "") or ""
    data["phone_verified"] = bool(getattr(owner, "phone_verified", False))
    data["email_verified"] = bool(getattr(owner, "email_verified", False))
    data["owner_phone"] = owner.phone or ""
    data["owner_email"] = owner.email or ""
    data["account_status"] = getattr(owner, "account_status", "active") or "active"
    if request:
        data["qr_uri"] = request.build_absolute_uri(f"/api/cards/verify/{card.verify_token}/qr/")
    return data
