from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.serializers.auth import StaffPublicSerializer


class StaffMeView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(StaffPublicSerializer(request.user).data)
