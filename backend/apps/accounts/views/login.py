from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers.auth import (
    AppTokenSerializer,
    AppUserPublicSerializer,
    LoginSerializer,
)
from apps.accounts.throttles import LoginRateThrottle


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = AppTokenSerializer.for_user(user)
        return Response({"user": AppUserPublicSerializer(user).data, **tokens})
