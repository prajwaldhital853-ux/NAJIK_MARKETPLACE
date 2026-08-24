from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.permissions import IsAppUser
from apps.accounts.views.staff_users import revoke_app_tokens
from apps.chat.models import ChatMessage, ChatThread
from apps.listings.models import Listing
from apps.reports.models import Complaint
from apps.reports.serializers import (
    ComplaintCreateSerializer,
    ComplaintSerializer,
    listing_snapshot,
    party_snapshot,
)
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


def set_user_status(user: AppUser, status_value: str):
    if status_value == "blocked":
        user.is_active = False
        user.account_status = AppUser.STATUS_BLOCKED
    elif status_value == "deactivated":
        user.is_active = False
        user.account_status = AppUser.STATUS_DEACTIVATED
    elif status_value == "active":
        user.is_active = True
        user.account_status = AppUser.STATUS_ACTIVE
    else:
        return
    user.save(update_fields=["is_active", "account_status"])
    if not user.is_active:
        revoke_app_tokens(user)


def send_warning(user: AppUser, message: str):
    user.staff_warning = message.strip()
    user.staff_warning_at = timezone.now()
    user.save(update_fields=["staff_warning", "staff_warning_at"])


def build_chat_transcript(thread: ChatThread) -> list:
    rows = []
    for msg in ChatMessage.objects.filter(thread=thread).select_related("sender").order_by("created_at")[:400]:
        rows.append(
            {
                "id": str(msg.id),
                "sender_id": str(msg.sender_id),
                "sender_name": msg.sender.full_name or "",
                "kind": msg.kind,
                "text": msg.text or "",
                "created_at": msg.created_at.isoformat(),
            }
        )
    return rows


class ComplaintCreateView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        reporter = request.user
        kind = data["kind"]
        accused = None
        listing = None
        thread = None
        transcript: list = []
        listing_snap: dict = {}

        if kind == Complaint.KIND_USER:
            accused = get_object_or_404(AppUser, pk=data["accused_id"])
            if accused.id == reporter.id:
                return Response({"detail": "You cannot report yourself."}, status=status.HTTP_400_BAD_REQUEST)

        elif kind == Complaint.KIND_LISTING:
            listing = get_object_or_404(Listing, pk=data["listing_id"])
            accused = listing.owner
            if accused_id := getattr(listing, "owner_id", None):
                if accused_id == reporter.id:
                    return Response({"detail": "You cannot report your own listing."}, status=status.HTTP_400_BAD_REQUEST)
            listing_snap = listing_snapshot(listing)

        elif kind == Complaint.KIND_CHAT:
            thread = get_object_or_404(ChatThread, pk=data["thread_id"])
            if reporter.id not in {thread.buyer_id, thread.seller_id}:
                return Response({"detail": "Not your chat."}, status=status.HTTP_403_FORBIDDEN)
            accused = thread.seller if thread.buyer_id == reporter.id else thread.buyer
            transcript = build_chat_transcript(thread)
            if thread.listing_id:
                listing = thread.listing
                listing_snap = listing_snapshot(listing)

        complaint = Complaint.objects.create(
            kind=kind,
            severity=data["severity"],
            reason=data["reason"].strip(),
            reporter=reporter,
            accused=accused,
            listing=listing,
            chat_thread=thread,
            transcript=transcript,
            listing_snapshot=listing_snap,
            reporter_snapshot=party_snapshot(reporter),
            accused_snapshot=party_snapshot(accused),
        )
        return Response(ComplaintSerializer(complaint).data, status=status.HTTP_201_CREATED)


class StaffComplaintListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        qs = Complaint.objects.select_related("reporter", "accused", "listing", "chat_thread").all()
        status_filter = (request.query_params.get("status") or "").strip()
        severity = (request.query_params.get("severity") or "").strip()
        kind = (request.query_params.get("kind") or "").strip()
        if status_filter in {Complaint.STATUS_OPEN, Complaint.STATUS_UNDER_REVIEW, Complaint.STATUS_RESOLVED}:
            qs = qs.filter(status=status_filter)
        if severity in {Complaint.SEVERITY_NORMAL, Complaint.SEVERITY_HIGH}:
            qs = qs.filter(severity=severity)
        if kind in {Complaint.KIND_USER, Complaint.KIND_LISTING, Complaint.KIND_CHAT}:
            qs = qs.filter(kind=kind)
        from apps.listings.listing_cards import paginate_queryset, parse_page

        page, page_size = parse_page(request, default_size=25, max_size=100)
        page_items, meta = paginate_queryset(qs, page, page_size)
        return Response({"results": ComplaintSerializer(page_items, many=True).data, **meta})


class StaffComplaintDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        complaint = get_object_or_404(
            Complaint.objects.select_related("reporter", "accused", "listing", "chat_thread"),
            pk=pk,
        )
        return Response(ComplaintSerializer(complaint).data)

    def patch(self, request, pk):
        complaint = get_object_or_404(
            Complaint.objects.select_related("reporter", "accused", "listing"),
            pk=pk,
        )
        next_status = str(request.data.get("status") or "").strip()
        if next_status in {Complaint.STATUS_OPEN, Complaint.STATUS_UNDER_REVIEW, Complaint.STATUS_RESOLVED}:
            complaint.status = next_status
            if next_status == Complaint.STATUS_RESOLVED:
                complaint.resolved_at = timezone.now()
            complaint.save(update_fields=["status", "resolved_at", "updated_at"])

        if "admin_note" in request.data:
            complaint.admin_note = str(request.data.get("admin_note") or "").strip()
            complaint.save(update_fields=["admin_note", "updated_at"])

        action = str(request.data.get("action") or "").strip()
        warning = str(request.data.get("warning_message") or request.data.get("warning_note") or "").strip()

        if action == "warn_accused":
            if not complaint.accused:
                return Response({"detail": "No accused user on this complaint."}, status=status.HTTP_400_BAD_REQUEST)
            if not warning:
                return Response({"detail": "Add a warning note for the user."}, status=status.HTTP_400_BAD_REQUEST)
            send_warning(complaint.accused, warning)
            complaint.warning_sent_to = "accused"
            complaint.warning_message = warning
            complaint.save(update_fields=["warning_sent_to", "warning_message", "updated_at"])

        elif action == "warn_reporter":
            if not warning:
                return Response({"detail": "Add a warning note for the user."}, status=status.HTTP_400_BAD_REQUEST)
            send_warning(complaint.reporter, warning)
            complaint.warning_sent_to = "reporter"
            complaint.warning_message = warning
            complaint.save(update_fields=["warning_sent_to", "warning_message", "updated_at"])

        elif action == "warn_both":
            if not warning:
                return Response({"detail": "Add a warning note for the users."}, status=status.HTTP_400_BAD_REQUEST)
            send_warning(complaint.reporter, warning)
            if complaint.accused:
                send_warning(complaint.accused, warning)
            complaint.warning_sent_to = "both"
            complaint.warning_message = warning
            complaint.save(update_fields=["warning_sent_to", "warning_message", "updated_at"])

        elif action == "block_accused":
            if not complaint.accused:
                return Response({"detail": "No accused user on this complaint."}, status=status.HTTP_400_BAD_REQUEST)
            set_user_status(complaint.accused, "blocked")
            complaint.accused_snapshot = party_snapshot(complaint.accused)
            complaint.save(update_fields=["accused_snapshot", "updated_at"])

        elif action == "block_reporter":
            set_user_status(complaint.reporter, "blocked")
            complaint.reporter_snapshot = party_snapshot(complaint.reporter)
            complaint.save(update_fields=["reporter_snapshot", "updated_at"])

        elif action == "block_both":
            set_user_status(complaint.reporter, "blocked")
            if complaint.accused:
                set_user_status(complaint.accused, "blocked")
            complaint.reporter_snapshot = party_snapshot(complaint.reporter)
            complaint.accused_snapshot = party_snapshot(complaint.accused)
            complaint.save(update_fields=["reporter_snapshot", "accused_snapshot", "updated_at"])

        elif action == "deactivate_accused":
            if not complaint.accused:
                return Response({"detail": "No accused user on this complaint."}, status=status.HTTP_400_BAD_REQUEST)
            set_user_status(complaint.accused, "deactivated")
            complaint.accused_snapshot = party_snapshot(complaint.accused)
            complaint.save(update_fields=["accused_snapshot", "updated_at"])

        elif action == "deactivate_reporter":
            set_user_status(complaint.reporter, "deactivated")
            complaint.reporter_snapshot = party_snapshot(complaint.reporter)
            complaint.save(update_fields=["reporter_snapshot", "updated_at"])

        elif action == "deactivate_both":
            set_user_status(complaint.reporter, "deactivated")
            if complaint.accused:
                set_user_status(complaint.accused, "deactivated")
            complaint.reporter_snapshot = party_snapshot(complaint.reporter)
            complaint.accused_snapshot = party_snapshot(complaint.accused)
            complaint.save(update_fields=["reporter_snapshot", "accused_snapshot", "updated_at"])

        elif action == "unblock_both":
            set_user_status(complaint.reporter, "active")
            if complaint.accused:
                set_user_status(complaint.accused, "active")
            complaint.reporter_snapshot = party_snapshot(complaint.reporter)
            complaint.accused_snapshot = party_snapshot(complaint.accused)
            complaint.save(update_fields=["reporter_snapshot", "accused_snapshot", "updated_at"])

        elif action == "clear_warning_accused" and complaint.accused:
            complaint.accused.staff_warning = ""
            complaint.accused.staff_warning_at = None
            complaint.accused.save(update_fields=["staff_warning", "staff_warning_at"])

        elif action == "clear_warning_reporter":
            complaint.reporter.staff_warning = ""
            complaint.reporter.staff_warning_at = None
            complaint.reporter.save(update_fields=["staff_warning", "staff_warning_at"])

        elif action and action not in {"", "none"}:
            return Response({"detail": f"Unknown action: {action}"}, status=status.HTTP_400_BAD_REQUEST)

        complaint = Complaint.objects.select_related("reporter", "accused", "listing").get(pk=complaint.pk)
        return Response(ComplaintSerializer(complaint).data)
