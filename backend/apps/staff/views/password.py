"""Staff password management views."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.serializers.auth import (
    PasswordChangeSerializer,
    PasswordStrengthSerializer,
)


class PasswordChangeView(APIView):
    """Change own password."""
    authentication_classes = [StaffJWTAuthentication]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        try:
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            "message": "Password changed successfully"
        })


class PasswordStrengthCheckView(APIView):
    """Live password strength validation."""
    authentication_classes = [StaffJWTAuthentication]

    def post(self, request):
        serializer = PasswordStrengthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validation = serializer.validated_data['password']
        return Response(validation)
