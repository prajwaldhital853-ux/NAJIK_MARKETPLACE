from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.otp import request_otp, verify_otp
from apps.accounts.permissions import IsAppUser
from apps.accounts.serializers.auth import (
    AppUserPublicSerializer,
    OtpRequestSerializer,
    OtpVerifySerializer,
)
from apps.accounts.throttles import OtpRateThrottle


class OtpRequestView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    throttle_classes = [OtpRateThrottle]

    def post(self, request):
        serializer = OtpRequestSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        request_otp(serializer.validated_data["identifier"], serializer.validated_data["purpose"])
        return Response({"detail": "If this contact is valid, a code was sent."})


class OtpVerifyView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    throttle_classes = [OtpRateThrottle]

    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        ident = serializer.validated_data["identifier"]
        purpose = serializer.validated_data["purpose"]
        if not verify_otp(ident, purpose, serializer.validated_data["code"]):
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if purpose == "phone":
            if user.phone and user.phone != ident:
                return Response({"detail": "Phone does not match this account."}, status=status.HTTP_400_BAD_REQUEST)
            if not user.phone:
                if AppUser.objects.filter(phone=ident).exclude(pk=user.pk).exists():
                    return Response({"detail": "Unable to verify this contact."}, status=status.HTTP_400_BAD_REQUEST)
                user.phone = ident
            user.phone_verified = True
            user.save(update_fields=["phone", "phone_verified"])
            from apps.accounts.models.referral import generate_referral_code, qualify_referral_for_buyer

            generate_referral_code(user)
            qualify_referral_for_buyer(user)
        else:
            if user.email and user.email.lower() != ident:
                return Response({"detail": "Email does not match this account."}, status=status.HTTP_400_BAD_REQUEST)
            if not user.email:
                if AppUser.objects.filter(email__iexact=ident).exclude(pk=user.pk).exists():
                    return Response({"detail": "Unable to verify this contact."}, status=status.HTTP_400_BAD_REQUEST)
                user.email = ident
            user.email_verified = True
            user.save(update_fields=["email", "email_verified"])
        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        return Response(AppUserPublicSerializer(user, context={"request": request}).data)
