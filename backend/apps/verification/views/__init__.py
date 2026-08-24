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
from apps.verification.models import ProviderApplication, ensure_provider_id_card
from apps.verification.serializers import (
    ProviderApplicationCreateSerializer,
    ProviderApplicationSerializer,
    ProviderApplicationStatusSerializer,
    ProviderProfileEditSerializer,
    apply_pending_profile,
    clear_pending_profile,
)
from apps.verification.views.id_card import (
    ProviderIdCardMePrintView,
    ProviderIdCardMeQrView,
    ProviderIdCardMeView,
    PublicIdCardVerifyQrView,
    PublicIdCardVerifyView,
    StaffIdCardDetailView,
    StaffIdCardListView,
)

__all__ = [
    "ProviderApplicationMeView",
    "ProviderApplicationMeFileView",
    "StaffApplicationListView",
    "StaffApplicationDetailView",
    "StaffApplicationFileView",
    "ProviderIdCardMeView",
    "ProviderIdCardMeQrView",
    "ProviderIdCardMePrintView",
    "PublicIdCardVerifyView",
    "PublicIdCardVerifyQrView",
    "StaffIdCardListView",
    "StaffIdCardDetailView",
]



def kyc_file_field(app, kind):
    mapping = {
        "nagrita": app.nagrita,
        "nagrita_back": app.nagrita_back,
        "photo": app.photo,
        "nation_card": app.nation_card,
        "other_document": app.other_document,
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
        ensure_provider_id_card(request.user)
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
            # Rejected providers can resubmit updated details for another review.
            if app.status != ProviderApplication.STATUS_REJECTED:
                return Response({"detail": "Wait until your account is verified before editing."}, status=status.HTTP_400_BAD_REQUEST)
            serializer = ProviderProfileEditSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            for field in ("full_name", "address", "contact", "service_type"):
                if field in data:
                    setattr(app, field, data[field])
                    if field == "full_name":
                        request.user.full_name = data[field]
                    if field == "address":
                        request.user.address = data[field]
            if data.get("nagrita_uri"):
                app.nagrita = data["nagrita_uri"]
            if data.get("nagrita_back_uri"):
                app.nagrita_back = data["nagrita_back_uri"]
            if data.get("photo_uri"):
                app.photo = data["photo_uri"]
            if data.get("nation_card_uri"):
                app.nation_card = data["nation_card_uri"]
            if data.get("other_document_uri"):
                app.other_document = data["other_document_uri"]
            if "profile_data" in data:
                app.profile_data = data["profile_data"] or {}
            app.status = ProviderApplication.STATUS_PENDING
            app.rejection_note = ""
            app.reviewed_at = None
            app.save()
            request.user.save(update_fields=["full_name", "address"])
            return Response(ProviderApplicationSerializer(app, context={"request": request}).data)
        serializer = ProviderProfileEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        edit = dict(app.pending_edit or {})
        for field in ("full_name", "address", "contact", "service_type"):
            if field in data:
                edit[field] = data[field]
        if "profile_data" in data:
            edit["profile_data"] = data["profile_data"] or {}
        app.pending_edit = edit
        if data.get("nagrita_uri"):
            app.pending_nagrita = data["nagrita_uri"]
        if data.get("nagrita_back_uri"):
            app.pending_nagrita_back = data["nagrita_back_uri"]
        if data.get("photo_uri"):
            app.pending_photo = data["photo_uri"]
        if data.get("nation_card_uri"):
            app.nation_card = data["nation_card_uri"]
        if data.get("other_document_uri"):
            app.other_document = data["other_document_uri"]
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
        items = ProviderApplication.objects.select_related("owner", "membership_plan").order_by("-created_at")
        status_filter = (request.query_params.get("status") or "").strip()
        if status_filter:
            items = items.filter(status=status_filter)
        pending_only = request.query_params.get("pending") == "1"
        if pending_only:
            items = items.filter(status=ProviderApplication.STATUS_PENDING)
        from apps.listings.listing_cards import paginate_queryset, parse_page

        page, page_size = parse_page(request, default_size=25, max_size=100)
        page_items, meta = paginate_queryset(items, page, page_size)
        rows = ProviderApplicationSerializer(page_items, many=True, context={"request": request}).data
        return Response({"results": rows, **meta})


class StaffApplicationDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        app = get_object_or_404(ProviderApplication.objects.select_related("membership_plan"), pk=pk)
        serializer = ProviderApplicationStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "membership_plan_id" in request.data or "membership_fee_label" in request.data:
            plan_id = data.get("membership_plan_id")
            if plan_id is None and "membership_plan_id" in request.data and request.data.get("membership_plan_id") is None:
                app.membership_plan = None
            elif plan_id:
                from apps.core.models import ProviderPlan

                plan = ProviderPlan.objects.filter(pk=plan_id).first()
                if not plan:
                    return Response({"detail": "Plan not found."}, status=status.HTTP_400_BAD_REQUEST)
                app.membership_plan = plan
            if "membership_fee_label" in request.data:
                app.membership_fee_label = (data.get("membership_fee_label") or "").strip()[:40]
            app.save(update_fields=["membership_plan", "membership_fee_label"])
            if "status" not in data:
                app.refresh_from_db()
                return Response(ProviderApplicationSerializer(app, context={"request": request}).data)

        if "status" not in data:
            return Response({"detail": "status is required."}, status=status.HTTP_400_BAD_REQUEST)

        next_status = data["status"]
        if app.has_pending_profile_edit() and app.status == ProviderApplication.STATUS_VERIFIED:
            if next_status == ProviderApplication.STATUS_VERIFIED:
                apply_pending_profile(app)
                app.reviewed_at = timezone.now()
                app.save(update_fields=["reviewed_at"])
                app.refresh_from_db()
                return Response(ProviderApplicationSerializer(app, context={"request": request}).data)
            note = (serializer.validated_data.get("rejection_note") or "").strip()
            # Note present → revoke the whole KYC; empty note → drop only the pending edit.
            if next_status == ProviderApplication.STATUS_REJECTED and note:
                clear_pending_profile(app)
                app.status = ProviderApplication.STATUS_REJECTED
                app.rejection_note = note
                app.reviewed_at = timezone.now()
                app.save(update_fields=["status", "rejection_note", "reviewed_at"])
                return Response(ProviderApplicationSerializer(app, context={"request": request}).data)
            clear_pending_profile(app)
            app.reviewed_at = timezone.now()
            app.save(update_fields=["reviewed_at"])
            app.refresh_from_db()
            return Response(ProviderApplicationSerializer(app, context={"request": request}).data)
        if next_status == ProviderApplication.STATUS_PENDING:
            if app.status != ProviderApplication.STATUS_REJECTED:
                return Response(
                    {"detail": "Only rejected applications can be reactivated to pending."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            app.status = ProviderApplication.STATUS_PENDING
            app.rejection_note = ""
            app.reviewed_at = None
            app.save(update_fields=["status", "rejection_note", "reviewed_at"])
            return Response(ProviderApplicationSerializer(app, context={"request": request}).data)
        if next_status == ProviderApplication.STATUS_REJECTED:
            note = (serializer.validated_data.get("rejection_note") or "").strip()
            if app.status == ProviderApplication.STATUS_VERIFIED and not note:
                return Response(
                    {"detail": "Add a rejection note explaining why this verified KYC is being revoked."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            app.status = next_status
            app.reviewed_at = timezone.now()
            app.rejection_note = note
            app.save(update_fields=["status", "reviewed_at", "rejection_note"])
            return Response(ProviderApplicationSerializer(app, context={"request": request}).data)
        app.status = next_status
        app.reviewed_at = timezone.now()
        app.rejection_note = ""
        app.save(update_fields=["status", "reviewed_at", "rejection_note"])
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
