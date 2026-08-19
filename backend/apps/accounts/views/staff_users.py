from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import AppUserPublicSerializer
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


class StaffAppUserSerializer(AppUserPublicSerializer):
    class Meta(AppUserPublicSerializer.Meta):
        fields = (*AppUserPublicSerializer.Meta.fields, "is_active", "account_status")
        read_only_fields = fields


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
        user = get_object_or_404(AppUser, pk=pk)
        status_value = str(request.data.get("status") or "").strip().lower()
        if "is_active" in request.data:
            user.is_active = parse_active(request.data.get("is_active"))
            user.account_status = AppUser.STATUS_ACTIVE if user.is_active else AppUser.STATUS_BLOCKED
        if status_value in {"blocked"}:
            user.is_active = False
            user.account_status = AppUser.STATUS_BLOCKED
        elif status_value in {"deactivated", "inactive"}:
            user.is_active = False
            user.account_status = AppUser.STATUS_DEACTIVATED
        elif status_value in {"active"}:
            user.is_active = True
            user.account_status = AppUser.STATUS_ACTIVE
        user.save(update_fields=["is_active", "account_status"])
        if not user.is_active:
            revoke_app_tokens(user)
        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        return Response(StaffAppUserSerializer(user, context={"request": request}).data)

    def delete(self, request, pk):
        user = get_object_or_404(AppUser, pk=pk)
        revoke_app_tokens(user)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
