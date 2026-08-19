from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AppUser
from apps.accounts.serializers.auth import AppTokenSerializer, RefreshSerializer, inactive_auth_error


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            if token.get("kind") != "app":
                return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
            token.blacklist()
            user = AppUser.objects.filter(pk=token["user_id"]).first()
            if user is None:
                return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
            if not user.is_active:
                return Response({"detail": inactive_auth_error(user)}, status=status.HTTP_401_UNAUTHORIZED)
            return Response(AppTokenSerializer.for_user(user))
        except TokenError:
            return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
