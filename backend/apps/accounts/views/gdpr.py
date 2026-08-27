"""User self-service and staff GDPR export/delete endpoints."""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.gdpr import delete_user_account, export_user_data, log_data_subject_action
from apps.accounts.permissions import IsAppUser
from apps.core.models import DataSubjectRequestLog, PrivacyRetentionConfig
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import require_rbac_method


class UserDataExportView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        config = PrivacyRetentionConfig.get_solo()
        if not config.allow_self_service_export:
            return Response(
                {"detail": "Self-service data export is currently disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )
        payload = export_user_data(request.user)
        log_data_subject_action(
            action=DataSubjectRequestLog.ACTION_EXPORT,
            source=DataSubjectRequestLog.SOURCE_SELF,
            user=request.user,
        )
        return Response(payload)


class UserDataDeleteSerializer(serializers.Serializer):
    confirm = serializers.CharField()
    password = serializers.CharField(required=False, allow_blank=True, max_length=128)

    def validate_confirm(self, value):
        if (value or "").strip().upper() != "DELETE":
            raise serializers.ValidationError('Type DELETE to confirm account deletion.')
        return value


class UserDataDeleteView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        config = PrivacyRetentionConfig.get_solo()
        if not config.allow_self_service_delete:
            return Response(
                {"detail": "Self-service account deletion is currently disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = UserDataDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if config.require_password_for_self_delete:
            if not user.has_usable_password():
                return Response(
                    {"detail": "Password confirmation required. Sign in with email/password or contact support."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            password = serializer.validated_data.get("password") or ""
            if not user.check_password(password):
                return Response({"detail": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)
        result = delete_user_account(user, source=DataSubjectRequestLog.SOURCE_SELF)
        return Response(result, status=status.HTTP_200_OK)


class StaffUserDataExportView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        require_rbac_method(request.user, "user_management", "GET")
        from django.shortcuts import get_object_or_404
        from apps.accounts.models import AppUser

        user = get_object_or_404(AppUser, pk=pk)
        payload = export_user_data(user)
        log_data_subject_action(
            action=DataSubjectRequestLog.ACTION_EXPORT,
            source=DataSubjectRequestLog.SOURCE_STAFF,
            user=user,
            staff=request.user,
        )
        return Response(payload)
