from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.serializers.auth import StaffLoginSerializer, StaffPublicSerializer, StaffTokenSerializer
from apps.staff.throttles import StaffLoginRateThrottle


class StaffLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [StaffLoginRateThrottle]

    def post(self, request):
        serializer = StaffLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = StaffTokenSerializer.for_user(user)
        return Response({"user": StaffPublicSerializer(user).data, **tokens})
