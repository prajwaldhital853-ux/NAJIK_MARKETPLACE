import mimetypes

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.notifications.models import AppNotice
from apps.notifications.serializers import AppNoticeCreateSerializer, AppNoticeSerializer
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


class StaffNoticeListCreateView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = AppNotice.objects.all()
        return Response(AppNoticeSerializer(items, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = AppNoticeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notice = serializer.save()
        return Response(
            AppNoticeSerializer(notice, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class StaffNoticeDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        notice = get_object_or_404(AppNotice, pk=pk)
        if "is_active" in request.data:
            notice.is_active = bool(request.data.get("is_active"))
            notice.save(update_fields=["is_active", "updated_at"])
        return Response(AppNoticeSerializer(notice, context={"request": request}).data)

    def delete(self, request, pk):
        notice = get_object_or_404(AppNotice, pk=pk)
        notice.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffNoticeImageView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        notice = get_object_or_404(AppNotice, pk=pk)
        if not notice.image:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(notice.image.name)
        return FileResponse(notice.image.open("rb"), content_type=content_type or "application/octet-stream")


class ActiveNoticeListView(APIView):
    """In-app notices for the signed-in buyer or seller."""

    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        account_type = request.user.account_type
        items = [
            notice
            for notice in AppNotice.objects.filter(is_active=True)
            if notice.matches_account(account_type)
        ]
        return Response(AppNoticeSerializer(items, many=True, context={"request": request}).data)


class ActiveNoticeImageView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request, pk):
        notice = get_object_or_404(AppNotice, pk=pk, is_active=True)
        if not notice.matches_account(request.user.account_type):
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not notice.image:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(notice.image.name)
        return FileResponse(notice.image.open("rb"), content_type=content_type or "application/octet-stream")
