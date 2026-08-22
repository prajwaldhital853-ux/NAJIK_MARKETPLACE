from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.chat.models import ChatThread
from apps.notifications.models import InboxNotice
from apps.notifications.services import normalize_target_id

GENERIC_SENDER_LABELS = {
    "New message",
    "Notification",
    "Booking request",
    "Booking accepted",
    "Booking rejected",
    "Booking cancelled",
    "Listing marked sold",
}


class InboxNoticeSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = InboxNotice
        fields = ("id", "title", "body", "kind", "target", "target_id", "sender_name", "is_read", "created_at")
        read_only_fields = fields

    def get_sender_name(self, obj):
        name = (obj.sender_name or "").strip()
        if name and name not in GENERIC_SENDER_LABELS:
            return name
        request = self.context.get("request")
        if obj.kind == InboxNotice.KIND_MESSAGE and obj.target == "chat" and obj.target_id and request:
            thread = self._chat_thread(obj.target_id)
            if thread:
                other = thread.seller if request.user.id == thread.buyer_id else thread.buyer
                label = (other.full_name or other.phone or "").strip()
                if label:
                    return label
        if name and name not in {"New message", "Notification"}:
            return name
        return "Someone"

    def _chat_thread(self, target_id: str):
        raw = str(target_id or "").strip()
        norm = normalize_target_id(raw)
        qs = ChatThread.objects.select_related("buyer", "seller")
        if len(norm) == 32:
            try:
                from uuid import UUID

                return qs.filter(pk=UUID(norm)).first()
            except ValueError:
                pass
        return qs.filter(pk=raw).first() or qs.filter(pk=norm).first()


class InboxListView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        items = InboxNotice.objects.filter(user=request.user)[:80]
        unread = InboxNotice.objects.filter(user=request.user, is_read=False).count()
        return Response(
            {
                "unread": unread,
                "items": InboxNoticeSerializer(items, many=True, context={"request": request}).data,
            }
        )


class InboxMarkView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        notice = get_object_or_404(InboxNotice, pk=pk, user=request.user)
        if request.data.get("dismiss") is True or request.data.get("delete") is True:
            notice_id = str(notice.id)
            notice.delete()
            unread = InboxNotice.objects.filter(user=request.user, is_read=False).count()
            return Response({"ok": True, "id": notice_id, "dismissed": True, "unread": unread})
        is_read = request.data.get("is_read")
        notice.is_read = bool(is_read) if is_read is not None else (not notice.is_read)
        notice.save(update_fields=["is_read"])
        return Response(InboxNoticeSerializer(notice).data)


class InboxDismissTargetView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        qs = InboxNotice.objects.filter(user=request.user)
        target = (request.data.get("target") or "").strip()
        raw_target_id = str(request.data.get("target_id") or "").strip()
        target_id = normalize_target_id(raw_target_id)
        kind = (request.data.get("kind") or "").strip()
        if target:
            qs = qs.filter(target=target)
        if target_id or raw_target_id:
            qs = qs.filter(
                Q(target_id=target_id)
                | Q(target_id=raw_target_id)
                | Q(target_id=raw_target_id.lower())
            )
        if kind:
            qs = qs.filter(kind=kind)
        if not target and not target_id and not kind:
            return Response({"detail": "Choose notices to remove."}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = qs.delete()
        unread = InboxNotice.objects.filter(user=request.user, is_read=False).count()
        return Response({"ok": True, "deleted": deleted, "unread": unread})


class InboxReadAllView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        if request.data.get("dismiss") is True:
            deleted, _ = InboxNotice.objects.filter(user=request.user).delete()
            return Response({"ok": True, "deleted": deleted, "unread": 0})
        InboxNotice.objects.filter(user=request.user, is_read=False).update(is_read=True)
        unread = InboxNotice.objects.filter(user=request.user, is_read=False).count()
        return Response({"ok": True, "unread": unread})
