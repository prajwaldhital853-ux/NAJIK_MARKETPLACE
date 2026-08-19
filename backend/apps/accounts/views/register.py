from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import (
    AppTokenSerializer,
    AppUserPublicSerializer,
    RegisterSerializer,
)
from apps.accounts.throttles import RegisterRateThrottle


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        tokens = AppTokenSerializer.for_user(user)
        return Response(
            {"user": AppUserPublicSerializer(user, context={"request": request}).data, **tokens},
            status=status.HTTP_201_CREATED,
        )
