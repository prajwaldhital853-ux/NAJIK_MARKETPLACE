from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.notifications.models import InboxNotice


class InboxNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InboxNotice
        fields = ("id", "title", "body", "kind", "target", "target_id", "is_read", "created_at")
        read_only_fields = fields


class InboxListView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        items = InboxNotice.objects.filter(user=request.user)[:80]
        unread = InboxNotice.objects.filter(user=request.user, is_read=False).count()
        return Response(
            {
                "unread": unread,
                "items": InboxNoticeSerializer(items, many=True).data,
            }
        )


class InboxMarkView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        notice = get_object_or_404(InboxNotice, pk=pk, user=request.user)
        is_read = request.data.get("is_read")
        notice.is_read = bool(is_read) if is_read is not None else (not notice.is_read)
        notice.save(update_fields=["is_read"])
        return Response(InboxNoticeSerializer(notice).data)


class InboxReadAllView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        InboxNotice.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})
