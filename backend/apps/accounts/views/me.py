from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.accounts.serializers.auth import AppUserPublicSerializer


class MeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        return Response(AppUserPublicSerializer(request.user).data)
