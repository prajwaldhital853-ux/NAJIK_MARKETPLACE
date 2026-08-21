from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import AppUserPublicSerializer
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from rest_framework import serializers


class StaffAppUserSerializer(AppUserPublicSerializer):
    nagrita_uri = serializers.SerializerMethodField()
    nagrita_back_uri = serializers.SerializerMethodField()
    nation_card_uri = serializers.SerializerMethodField()
    other_document_uri = serializers.SerializerMethodField()
    avatar_uri = serializers.SerializerMethodField()

    class Meta(AppUserPublicSerializer.Meta):
        fields = (
            *AppUserPublicSerializer.Meta.fields,
            "is_active",
            "account_status",
            "nagrita_uri",
            "nagrita_back_uri",
            "nation_card_uri",
            "other_document_uri",
            "avatar_uri",
        )
        read_only_fields = fields

    def _staff_file(self, app, kind: str):
        request = self.context.get("request")
        if not request or not app:
            return None
        field = getattr(app, kind, None)
        if not field:
            return None
        return request.build_absolute_uri(f"/api/admin/verification/applications/{app.id}/file/{kind}/")

    def get_nagrita_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "nagrita")

    def get_nagrita_back_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "nagrita_back")

    def get_nation_card_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "nation_card")

    def get_other_document_uri(self, obj: AppUser):
        return self._staff_file(self._app(obj), "other_document")

    def get_avatar_uri(self, obj: AppUser):
        request = self.context.get("request")
        if not request or not obj.avatar:
            return None
        try:
            return request.build_absolute_uri(obj.avatar.url)
        except Exception:
            return None


def parse_active(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "yes", "active"}


def revoke_app_tokens(user):
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

        OutstandingToken.objects.filter(user_id=user.id).delete()
    except Exception:
        pass


class StaffAppUserListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = AppUser.objects.select_related("provider_application").order_by("-date_joined")
        return Response(StaffAppUserSerializer(items, many=True, context={"request": request}).data)


class StaffAppUserDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        from django.utils import timezone

        user = get_object_or_404(AppUser, pk=pk)
        status_value = str(request.data.get("status") or "").strip().lower()
        update_fields: list[str] = []

        if "is_active" in request.data:
            user.is_active = parse_active(request.data.get("is_active"))
            user.account_status = AppUser.STATUS_ACTIVE if user.is_active else AppUser.STATUS_BLOCKED
            update_fields.extend(["is_active", "account_status"])
        if status_value in {"blocked"}:
            user.is_active = False
            user.account_status = AppUser.STATUS_BLOCKED
            update_fields.extend(["is_active", "account_status"])
        elif status_value in {"deactivated", "inactive"}:
            user.is_active = False
            user.account_status = AppUser.STATUS_DEACTIVATED
            update_fields.extend(["is_active", "account_status"])
        elif status_value in {"active"}:
            user.is_active = True
            user.account_status = AppUser.STATUS_ACTIVE
            update_fields.extend(["is_active", "account_status"])

        note = request.data.get("staff_warning", request.data.get("notes", None))
        if note is not None:
            text = str(note).strip()
            user.staff_warning = text
            user.staff_warning_at = timezone.now() if text else None
            update_fields.extend(["staff_warning", "staff_warning_at"])

        if update_fields:
            user.save(update_fields=list(dict.fromkeys(update_fields)))
        if not user.is_active and status_value in {"blocked", "deactivated", "inactive"}:
            revoke_app_tokens(user)
        elif "is_active" in request.data and not user.is_active:
            revoke_app_tokens(user)

        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        return Response(StaffAppUserSerializer(user, context={"request": request}).data)

    def delete(self, request, pk):
        user = get_object_or_404(AppUser, pk=pk)
        revoke_app_tokens(user)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
