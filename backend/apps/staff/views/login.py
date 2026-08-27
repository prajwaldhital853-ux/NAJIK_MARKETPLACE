"""
Enhanced staff login with device verification and account lockout.
"""
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.staff.lockout import get_lockout_row, lockout_payload, lockout_seconds_remaining
from apps.staff.models import EmailVerificationCode, StaffUser
from apps.staff.serializers.auth import (
    EmailVerificationSerializer,
    StaffLoginSerializer,
    StaffPublicSerializer,
    StaffTokenSerializer,
    generate_verification_code,
    get_client_ip,
    get_device_fingerprint,
)
from apps.staff.throttles import StaffLoginRateThrottle


class StaffLoginView(APIView):
    """
    Staff login with security features:
    - Device lockout after 3 failed attempts (10 minutes) on that browser only
    - Device verification for new devices
    - Login attempt logging
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [StaffLoginRateThrottle]

    def post(self, request):
        serializer = StaffLoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data["user"]
        requires_verification = serializer.validated_data.get("requires_verification", False)
        device_fingerprint = serializer.validated_data.get("device_fingerprint", "")

        if requires_verification:
            # Send verification email
            # TODO: Use 1234 as code until email provider is configured
            code = "1234"  # Hardcoded for now
            verification = EmailVerificationCode.objects.create(
                staff=user,
                code=code,
                device_fingerprint=device_fingerprint,
                ip_address=request.META.get('REMOTE_ADDR'),
                expires_at=timezone.now() + timezone.timedelta(minutes=10),
            )

            # Email sending disabled - use code 1234
            # try:
            #     send_mail(...)
            # except Exception as e:
            #     print(f"Failed to send verification email: {e}")

            return Response({
                "requires_verification": True,
                "staff_id": str(user.id),
                "email": user.email,
                "message": f"Verification code: 1234 (use this code until email is configured)",
                "debug_code": "1234",  # Remove in production
            }, status=status.HTTP_200_OK)
        
        # Device is trusted, complete login
        tokens = StaffTokenSerializer.for_user(user)
        return Response({
            "user": StaffPublicSerializer(user).data,
            **tokens
        })


class StaffLockoutStatusView(APIView):
    """Return lockout countdown for the login page without attempting a password."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [StaffLoginRateThrottle]

    def get(self, request):
        email = (request.query_params.get("email") or "").strip().lower()
        device_fingerprint = (
            (request.query_params.get("device_fingerprint") or "").strip()
            or get_device_fingerprint(request)
        )
        if not email:
            return Response({"locked": False})

        staff = StaffUser.objects.filter(email__iexact=email).first()
        if staff and staff.is_account_locked():
            return Response(
                {
                    "locked": True,
                    "detail": "This staff account has been locked by an administrator. Contact your Super Admin.",
                    "code": "account_locked",
                }
            )

        row = get_lockout_row(email, get_client_ip(request), device_fingerprint)
        if not row or not lockout_seconds_remaining(row):
            return Response({"locked": False})

        return Response({"locked": True, **lockout_payload(row)})


class EmailVerificationView(APIView):
    """Verify email code and complete login from new device."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [StaffLoginRateThrottle]

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data["user"]
        tokens = StaffTokenSerializer.for_user(user)
        
        return Response({
            "user": StaffPublicSerializer(user).data,
            **tokens
        })


class ResendVerificationView(APIView):
    """Resend verification code."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [StaffLoginRateThrottle]

    def post(self, request):
        staff_id = request.data.get('staff_id')
        device_fingerprint = request.data.get('device_fingerprint')

        if not staff_id or not device_fingerprint:
            return Response(
                {"detail": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.staff.models import StaffUser
            user = StaffUser.objects.get(id=staff_id)
        except StaffUser.DoesNotExist:
            return Response(
                {"detail": "Invalid request"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Invalidate old codes
        EmailVerificationCode.objects.filter(
            staff=user,
            device_fingerprint=device_fingerprint,
            is_used=False
        ).update(is_used=True)

        # Create new code - use 1234 for now
        code = "1234"
        EmailVerificationCode.objects.create(
            staff=user,
            code=code,
            device_fingerprint=device_fingerprint,
            ip_address=request.META.get('REMOTE_ADDR'),
            expires_at=timezone.now() + timezone.timedelta(minutes=10),
        )

        # Email disabled until provider configured
        # try:
        #     send_mail(...)
        # except Exception as e:
        #     print(f"Failed to send verification email: {e}")

        return Response({
            "message": f"Verification code: 1234 (use this until email is configured)",
            "debug_code": "1234",  # Remove in production
        })
