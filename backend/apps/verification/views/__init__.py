import mimetypes

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.accounts.throttles import SellerApplyRateThrottle
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.verification.models import ProviderApplication
from apps.verification.serializers import (
    ProviderApplicationCreateSerializer,
    ProviderApplicationSerializer,
    ProviderApplicationStatusSerializer,
    ProviderProfileEditSerializer,
    apply_pending_profile,
    clear_pending_profile,
)


def kyc_file_field(app, kind):
    mapping = {
        "nagrita": app.nagrita,
        "nagrita_back": app.nagrita_back,
        "photo": app.photo,
        "pending_nagrita": app.pending_nagrita,
        "pending_nagrita_back": app.pending_nagrita_back,
        "pending_photo": app.pending_photo,
    }
    return mapping.get(kind)


class ProviderApplicationMeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    throttle_classes = [SellerApplyRateThrottle]

    def check_throttles(self, request):
        if request.method != "POST":
            return
        super().check_throttles(request)

    def get(self, request):
        try:
            app = request.user.provider_application
        except ProviderApplication.DoesNotExist:
            return Response({"status": "none"})
        return Response(ProviderApplicationSerializer(app, context={"request": request}).data)

    def post(self, request):
        if request.user.account_type != request.user.ACCOUNT_PROVIDER:
            return Response({"detail": "Only service providers can apply."}, status=status.HTTP_403_FORBIDDEN)
        if not (request.user.phone_verified or request.user.email_verified):
            return Response(
                {"detail": "Verify your phone or email before submitting."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if ProviderApplication.objects.filter(owner=request.user).exists():
            return Response({"detail": "Application already submitted."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ProviderApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        app = serializer.save(owner=request.user)
        return Response(
            ProviderApplicationSerializer(app, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        if request.user.account_type != request.user.ACCOUNT_PROVIDER:
            return Response({"detail": "Only service providers can edit this profile."}, status=status.HTTP_403_FORBIDDEN)
        try:
            app = request.user.provider_application
        except ProviderApplication.DoesNotExist:
            return Response({"detail": "Submit your application first."}, status=status.HTTP_400_BAD_REQUEST)
        if app.status != ProviderApplication.STATUS_VERIFIED:
            return Response({"detail": "Wait until your account is verified before editing."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ProviderProfileEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        edit = dict(app.pending_edit or {})
        for field in ("full_name", "address", "contact", "service_type"):
            if field in data:
                edit[field] = data[field]
        app.pending_edit = edit
        if data.get("nagrita_uri"):
            app.pending_nagrita = data["nagrita_uri"]
        if data.get("nagrita_back_uri"):
            app.pending_nagrita_back = data["nagrita_back_uri"]
        if data.get("photo_uri"):
            app.pending_photo = data["photo_uri"]
        app.save()
        return Response(ProviderApplicationSerializer(app, context={"request": request}).data)


class ProviderApplicationMeFileView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request, kind):
        try:
            app = request.user.provider_application
        except ProviderApplication.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        field = kyc_file_field(app, kind)
        if not field:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(field.name)
        return FileResponse(field.open("rb"), content_type=content_type or "application/octet-stream")


class StaffApplicationListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = ProviderApplication.objects.select_related("owner").order_by("-created_at")
        return Response(ProviderApplicationSerializer(items, many=True, context={"request": request}).data)


class StaffApplicationDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        app = get_object_or_404(ProviderApplication, pk=pk)
        serializer = ProviderApplicationStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        next_status = serializer.validated_data["status"]
        if app.has_pending_profile_edit() and app.status == ProviderApplication.STATUS_VERIFIED:
            if next_status == ProviderApplication.STATUS_VERIFIED:
                apply_pending_profile(app)
            else:
                clear_pending_profile(app)
            app.reviewed_at = timezone.now()
            app.save(update_fields=["reviewed_at"])
            app.refresh_from_db()
            return Response(ProviderApplicationSerializer(app, context={"request": request}).data)
        app.status = next_status
        app.reviewed_at = timezone.now()
        app.save(update_fields=["status", "reviewed_at"])
        return Response(ProviderApplicationSerializer(app, context={"request": request}).data)


class StaffApplicationFileView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk, kind):
        app = get_object_or_404(ProviderApplication, pk=pk)
        field = kyc_file_field(app, kind)
        if not field:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(field.name)
        return FileResponse(field.open("rb"), content_type=content_type or "application/octet-stream")
