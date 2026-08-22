import mimetypes

from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.permissions import IsAppUser
from apps.chat.models import ChatBlock, ChatMessage, ChatReport, ChatThread
from apps.chat.serializers import (
    ChatMessageSerializer,
    ChatMessageWriteSerializer,
    ChatReportWriteSerializer,
    ChatStartSerializer,
    ChatThreadSerializer,
    admin_party,
    pair_blocked,
)
from apps.chat.presence import is_viewing_thread, mark_viewing_thread
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


def touch_presence(user):
    AppUser.objects.filter(pk=user.pk).update(last_seen=timezone.now())
    user.last_seen = timezone.now()


def participant_threads(user):
    return ChatThread.objects.filter(Q(buyer=user) | Q(seller=user)).select_related(
        "buyer",
        "seller",
        "listing",
    )


def snapshot_messages(thread):
    rows = []
    for msg in thread.messages.select_related("sender").order_by("created_at"):
        rows.append(
            {
                "id": str(msg.id),
                "sender_id": str(msg.sender_id),
                "sender_name": msg.sender.full_name or "NAJIK user",
                "kind": msg.kind,
                "text": msg.text,
                "lat": msg.lat,
                "lng": msg.lng,
                "location_label": msg.location_label,
                "has_image": bool(msg.image),
                "has_voice": bool(msg.voice),
                "created_at": msg.created_at.isoformat(),
            }
        )
    return rows


def mark_read(thread, user):
    thread.messages.exclude(sender=user).filter(read_at__isnull=True).update(read_at=timezone.now())


class PresenceView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        touch_presence(request.user)
        mark_viewing_thread(request.user, request.data.get("thread_id"))
        return Response({"ok": True, "last_seen": request.user.last_seen.isoformat()})


class ChatThreadListView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        touch_presence(request.user)
        items = participant_threads(request.user)
        return Response(ChatThreadSerializer(items, many=True, context={"request": request}).data)

    def post(self, request):
        touch_presence(request.user)
        serializer = ChatStartSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        listing = serializer.validated_data["listing"]
        
        existing = ChatThread.objects.filter(listing=listing, buyer=request.user, seller=listing.owner).first()
        if existing:
            thread = existing
            created = False
            thread.listing_title = listing.title
            thread.listing_price = listing.price or ""
            thread.listing_location = listing.location or ""
            thread.save(update_fields=["listing_title", "listing_price", "listing_location", "updated_at"])
        else:
            thread, created = ChatThread.objects.get_or_create(
                listing=listing,
                buyer=request.user,
                seller=listing.owner,
                defaults={
                    "listing_title": listing.title,
                    "listing_price": listing.price or "",
                    "listing_location": listing.location or "",
                },
            )
        
        thread = participant_threads(request.user).get(pk=thread.pk)
        mark_viewing_thread(request.user, thread.id)
        mark_read(thread, request.user)
        return Response(
            ChatThreadSerializer(thread, context={"request": request, "include_messages": True}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ChatThreadDetailView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request, pk):
        touch_presence(request.user)
        thread = get_object_or_404(participant_threads(request.user), pk=pk)
        mark_viewing_thread(request.user, thread.id)
        mark_read(thread, request.user)
        since = request.query_params.get("since")
        parsed = parse_datetime(since) if since else None
        return Response(
            ChatThreadSerializer(
                thread,
                context={"request": request, "include_messages": True, "since": parsed},
            ).data
        )


class ChatMessageCreateView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        touch_presence(request.user)
        thread = get_object_or_404(participant_threads(request.user), pk=pk)
        other = thread.other_user(request.user)
        if pair_blocked(request.user, other):
            return Response({"detail": "This conversation is blocked."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ChatMessageWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        msg = ChatMessage(
            thread=thread,
            sender=request.user,
            kind=data["kind"],
            text=(data.get("text") or "").strip(),
            lat=data.get("lat"),
            lng=data.get("lng"),
            location_label=(data.get("location_label") or "").strip(),
        )
        if data["kind"] == ChatMessage.KIND_IMAGE:
            msg.image = data["image_file"]
        if data["kind"] == ChatMessage.KIND_VOICE:
            msg.voice = data["voice_file"]
        msg.save()
        thread.save(update_fields=["updated_at"])
        preview = (data.get("text") or "").strip() or "New message"
        if data["kind"] == ChatMessage.KIND_IMAGE:
            preview = "Sent a photo"
        elif data["kind"] == ChatMessage.KIND_VOICE:
            preview = "Sent a voice note"
        elif data["kind"] == ChatMessage.KIND_LOCATION:
            preview = "Shared a location"
        elif data["kind"] == ChatMessage.KIND_BOOKING:
            preview = "Booking update"
        from apps.notifications.models import InboxNotice
        from apps.notifications.services import notify_user

        other_thread = ChatThread.objects.filter(pk=thread.pk).first()
        if not is_viewing_thread(other, other_thread):
            sender_name = (request.user.full_name or request.user.phone or "Someone").strip()
            notify_user(
                other,
                "New message",
                preview[:160],
                InboxNotice.KIND_MESSAGE,
                "chat",
                str(thread.id),
                sender_name=sender_name,
            )
        return Response(ChatMessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ChatBlockView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        thread = get_object_or_404(participant_threads(request.user), pk=pk)
        other = thread.other_user(request.user)
        ChatBlock.objects.get_or_create(blocker=request.user, blocked=other)
        thread = participant_threads(request.user).get(pk=thread.pk)
        return Response(ChatThreadSerializer(thread, context={"request": request, "include_messages": True}).data)


class ChatReportView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        thread = get_object_or_404(participant_threads(request.user), pk=pk)
        serializer = ChatReportWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        accused = thread.other_user(request.user)
        listing = thread.listing
        report = ChatReport.objects.create(
            thread=thread,
            reporter=request.user,
            accused=accused,
            reason=serializer.validated_data["reason"].strip(),
            transcript=snapshot_messages(thread),
            listing_snapshot={
                "id": str(listing.id) if listing else None,
                "title": thread.listing_title,
                "price": thread.listing_price,
                "location": thread.listing_location,
                "contact_phone": listing.contact_phone if listing else "",
                "contact_name": listing.contact_name if listing else "",
            },
            reporter_snapshot=admin_party(request.user),
            accused_snapshot=admin_party(accused),
        )
        try:
            from apps.reports.models import Complaint
            from apps.reports.serializers import listing_snapshot as ls, party_snapshot as ps

            Complaint.objects.create(
                kind=Complaint.KIND_CHAT,
                severity=serializer.validated_data.get("severity") or Complaint.SEVERITY_NORMAL,
                reason=report.reason,
                reporter=request.user,
                accused=accused,
                listing=listing,
                chat_thread=thread,
                chat_report=report,
                transcript=report.transcript,
                listing_snapshot=report.listing_snapshot or (ls(listing) if listing else {}),
                reporter_snapshot=ps(request.user),
                accused_snapshot=ps(accused),
            )
        except Exception:
            pass
        return Response({"id": str(report.id), "status": report.status}, status=status.HTTP_201_CREATED)


class ChatMessageFileView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request, pk):
        msg = get_object_or_404(ChatMessage.objects.select_related("thread"), pk=pk)
        if not msg.thread.is_participant(request.user):
            return Response(status=status.HTTP_404_NOT_FOUND)
        field = msg.image if msg.image else msg.voice
        if not field:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(field.name)
        return FileResponse(field.open("rb"), content_type=content_type or "application/octet-stream")


class StaffChatReportListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = ChatReport.objects.select_related("reporter", "accused", "thread").order_by("-created_at")
        return Response([serialize_staff_report(row, request, messages=False) for row in items])


class StaffChatReportDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        row = get_object_or_404(ChatReport.objects.select_related("reporter", "accused", "thread"), pk=pk)
        return Response(serialize_staff_report(row, request, messages=True))

    def patch(self, request, pk):
        row = get_object_or_404(ChatReport.objects.select_related("reporter", "accused", "thread"), pk=pk)
        status_value = (request.data.get("status") or "").strip()
        if status_value in {ChatReport.STATUS_OPEN, ChatReport.STATUS_REVIEW, ChatReport.STATUS_RESOLVED}:
            row.status = status_value
        if "admin_note" in request.data:
            row.admin_note = str(request.data.get("admin_note") or "")
        action = (request.data.get("action") or "").strip()
        reporter = row.reporter
        accused = row.accused
        if action == "block_reporter":
            reporter.is_active = False
            reporter.save(update_fields=["is_active"])
        elif action == "block_accused":
            accused.is_active = False
            accused.save(update_fields=["is_active"])
        elif action == "block_both":
            reporter.is_active = False
            accused.is_active = False
            reporter.save(update_fields=["is_active"])
            accused.save(update_fields=["is_active"])
        elif action == "unblock_both":
            reporter.is_active = True
            accused.is_active = True
            reporter.save(update_fields=["is_active"])
            accused.save(update_fields=["is_active"])
        row.reporter_snapshot = admin_party(reporter)
        row.accused_snapshot = admin_party(accused)
        row.save()
        row = ChatReport.objects.select_related("reporter", "accused", "thread").get(pk=row.pk)
        return Response(serialize_staff_report(row, request, messages=True))


class StaffChatMessageFileView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        msg = get_object_or_404(ChatMessage, pk=pk)
        field = msg.image if msg.image else msg.voice
        if not field:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(field.name)
        return FileResponse(field.open("rb"), content_type=content_type or "application/octet-stream")


def serialize_staff_report(row: ChatReport, request, messages=False):
    live = []
    if messages:
        live = ChatMessageSerializer(
            row.thread.messages.select_related("sender").order_by("created_at"),
            many=True,
            context={"request": request},
        ).data
    return {
        "id": str(row.id),
        "status": row.status,
        "reason": row.reason,
        "admin_note": row.admin_note,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
        "thread_id": str(row.thread_id),
        "listing": row.listing_snapshot,
        "reporter": row.reporter_snapshot,
        "accused": row.accused_snapshot,
        "transcript": row.transcript,
        "live_messages": live,
        "reporter_active": row.reporter.is_active,
        "accused_active": row.accused.is_active,
    }
