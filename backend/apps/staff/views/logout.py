from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.serializers.auth import StaffLogoutSerializer


class StaffLogoutView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = StaffLogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            if token.get("kind") != "staff":
                return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(status=status.HTTP_204_NO_CONTENT)
