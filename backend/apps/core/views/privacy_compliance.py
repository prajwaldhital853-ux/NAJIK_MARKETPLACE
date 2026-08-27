"""Privacy, legal documents, and retention settings for General App Control."""
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.legal_defaults import ensure_legal_documents
from apps.core.models import DataSubjectRequestLog, LegalDocumentConfig, PrivacyRetentionConfig
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import require_rbac_method


def _validate_sections(value):
    if not isinstance(value, list):
        raise serializers.ValidationError("sections must be a list")
    for idx, section in enumerate(value):
        if not isinstance(section, dict):
            raise serializers.ValidationError(f"Section {idx} must be an object")
        if not str(section.get("title") or "").strip():
            raise serializers.ValidationError(f"Section {idx} requires a title")
        paragraphs = section.get("paragraphs") or []
        if not isinstance(paragraphs, list):
            raise serializers.ValidationError(f"Section {idx} paragraphs must be a list")
    return value


class PrivacyRetentionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyRetentionConfig
        fields = (
            "inactive_account_retention_days",
            "kyc_retention_days_after_deletion",
            "chat_message_retention_days",
            "login_lockout_retention_days",
            "staff_login_attempt_retention_days",
            "otp_retention_days",
            "password_reset_token_retention_days",
            "allow_self_service_export",
            "allow_self_service_delete",
            "require_password_for_self_delete",
            "anonymize_complaint_snapshots_on_delete",
            "retention_policy_summary",
            "updated_at",
        )
        read_only_fields = ("updated_at",)


class LegalDocumentSerializer(serializers.ModelSerializer):
    sections = serializers.JSONField()

    class Meta:
        model = LegalDocumentConfig
        fields = (
            "doc_type",
            "role",
            "title",
            "last_updated_label",
            "intro",
            "sections",
            "footer",
            "version",
            "is_published",
            "updated_at",
            "published_at",
        )
        read_only_fields = ("doc_type", "role", "updated_at", "published_at")

    def validate_sections(self, value):
        return _validate_sections(value)


class PublicPrivacyRetentionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        config = PrivacyRetentionConfig.get_solo()
        return Response(config.as_public_dict())


class PublicLegalDocumentView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, doc_type):
        doc_type = (doc_type or "").strip().lower()
        if doc_type not in {LegalDocumentConfig.DOC_TERMS, LegalDocumentConfig.DOC_PRIVACY}:
            return Response({"detail": "Unknown document."}, status=status.HTTP_404_NOT_FOUND)
        role = (request.query_params.get("role") or "buyer").strip().lower()
        if role in {"provider", "seller"}:
            role = LegalDocumentConfig.ROLE_SELLER
        elif role != LegalDocumentConfig.ROLE_SELLER:
            role = LegalDocumentConfig.ROLE_BUYER
        ensure_legal_documents()
        row = LegalDocumentConfig.objects.filter(doc_type=doc_type, role=role, is_published=True).first()
        if not row:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(row.as_public_dict())


class StaffPrivacyRetentionView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        config = PrivacyRetentionConfig.get_solo()
        payload = PrivacyRetentionSerializer(config).data
        recent = DataSubjectRequestLog.objects.all()[:20]
        payload["recent_requests"] = [
            {
                "id": str(row.id),
                "action": row.action,
                "source": row.source,
                "user_id": str(row.user_id) if row.user_id else None,
                "user_email": row.user_email,
                "detail": row.detail,
                "created_at": row.created_at,
            }
            for row in recent
        ]
        return Response(payload)

    def patch(self, request):
        require_rbac_method(request.user, "app_control", "PATCH")
        config = PrivacyRetentionConfig.get_solo()
        serializer = PrivacyRetentionSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PrivacyRetentionSerializer(config).data)


class StaffApplyRetentionView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request):
        require_rbac_method(request.user, "app_control", "POST")
        from apps.accounts.gdpr import apply_retention_policies

        purge_inactive = bool(request.data.get("purge_inactive"))
        stats = apply_retention_policies(purge_inactive=purge_inactive)
        return Response({"ok": True, "stats": stats})


class StaffLegalDocumentListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        ensure_legal_documents()
        rows = LegalDocumentConfig.objects.all()
        return Response([row.as_admin_dict() for row in rows])


class StaffLegalDocumentDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, doc_type, role):
        ensure_legal_documents()
        row = LegalDocumentConfig.objects.filter(doc_type=doc_type, role=role).first()
        if not row:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(row.as_admin_dict())

    def patch(self, request, doc_type, role):
        require_rbac_method(request.user, "app_control", "PATCH")
        ensure_legal_documents()
        row = LegalDocumentConfig.objects.filter(doc_type=doc_type, role=role).first()
        if not row:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = LegalDocumentSerializer(row, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        bump_version = bool(request.data.get("publish"))
        for field, value in serializer.validated_data.items():
            setattr(row, field, value)
        if bump_version:
            row.version += 1
            row.published_at = timezone.now()
            if not row.last_updated_label:
                row.last_updated_label = timezone.localdate().strftime("%d %B %Y")
        row.save()
        return Response(row.as_admin_dict())
