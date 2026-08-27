"""
Enhanced authentication serializers with security features.
"""
import random
import string
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.staff.exceptions import StaffAccountLocked
from apps.staff.lockout import (
    LOCKOUT_AFTER,
    assert_login_not_locked,
    lockout_seconds_remaining,
    record_login_failure,
    record_login_success,
)
from apps.staff.models import (
    StaffUser,
    LoginAttempt,
    TrustedDevice,
    EmailVerificationCode,
    Role,
)

GENERIC_AUTH_ERROR = "Invalid credentials."


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return ''.join(random.choices(string.digits, k=6))


def get_device_fingerprint(request) -> str:
    """
    Generate device fingerprint from request.
    Combines User-Agent and other headers for unique identification.
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    return f"{user_agent}:{accept_lang}"[:255]


def get_client_ip(request) -> str:
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class StaffTokenSerializer:
    @staticmethod
    def for_user(user: StaffUser) -> dict:
        refresh = RefreshToken()
        refresh["user_id"] = str(user.id)
        refresh["kind"] = "staff"
        access = refresh.access_token
        access["kind"] = "staff"
        access["user_id"] = str(user.id)
        user.record_successful_login()
        return {
            "access": str(access),
            "refresh": str(refresh),
            "token_type": "bearer",
        }


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "description", "is_active", "is_system_role")
        read_only_fields = fields


class StaffPublicSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = StaffUser
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "is_super_admin",
            "must_change_password",
            "date_joined",
            "last_login",
            "is_active",
            "is_locked",
            "permissions",
        )
        read_only_fields = fields

    def get_permissions(self, obj):
        """Return list of permission codes for frontend routing."""
        return list(obj.get_all_permissions())


class StaffLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})
    device_fingerprint = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        password = attrs["password"]
        request = self.context.get('request')

        # Get device info
        device_fingerprint = attrs.get('device_fingerprint') or (
            get_device_fingerprint(request) if request else ''
        )
        ip_address = get_client_ip(request) if request else None

        # Fetch staff
        staff = StaffUser.objects.filter(email__iexact=email).first()

        # Record attempt
        attempt = LoginAttempt.objects.create(
            staff=staff,
            email=email,
            success=False,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            device_fingerprint=device_fingerprint,
        )

        # Validate credentials
        if staff is None:
            attempt.failure_reason = "User not found"
            attempt.save(update_fields=["failure_reason"])
            raise serializers.ValidationError(GENERIC_AUTH_ERROR)

        if not staff.is_active:
            attempt.failure_reason = "Account inactive"
            attempt.save(update_fields=["failure_reason"])
            raise serializers.ValidationError("Your account has been deactivated.")

        # Super-admin manual account lock still blocks all devices.
        if staff.is_account_locked():
            seconds_left = max(1, int((staff.locked_until - timezone.now()).total_seconds()))
            attempt.failure_reason = f"Account locked ({seconds_left}s remaining)"
            attempt.save(update_fields=["failure_reason"])
            raise serializers.ValidationError(
                "This staff account has been locked by an administrator. Contact your Super Admin."
            )

        assert_login_not_locked(email, ip_address, device_fingerprint)

        if not staff.check_password(password):
            row = record_login_failure(email, ip_address, device_fingerprint)
            attempt.failure_reason = "Invalid password"
            attempt.save(update_fields=["failure_reason"])

            if lockout_seconds_remaining(row):
                raise StaffAccountLocked(row)

            remaining = LOCKOUT_AFTER - row.fail_count
            raise serializers.ValidationError(
                f"{GENERIC_AUTH_ERROR} ({remaining} attempts remaining)"
            )

        record_login_success(email, ip_address, device_fingerprint)

        # Success - record it
        attempt.success = True
        attempt.staff = staff
        attempt.save(update_fields=["success", "staff"])

        # Check if device is trusted
        trusted_device = TrustedDevice.objects.filter(
            staff=staff,
            device_fingerprint=device_fingerprint
        ).first()

        if trusted_device and trusted_device.is_valid():
            # Device is trusted, allow login
            trusted_device.touch()
            attrs["user"] = staff
            attrs["requires_verification"] = False
            attrs["device_fingerprint"] = device_fingerprint
        else:
            # New device, require email verification
            attrs["user"] = staff
            attrs["requires_verification"] = True
            attrs["device_fingerprint"] = device_fingerprint

        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Verify email code for new device login."""
    staff_id = serializers.UUIDField()
    code = serializers.CharField(max_length=6)
    device_fingerprint = serializers.CharField()

    def validate(self, attrs):
        try:
            staff = StaffUser.objects.get(id=attrs["staff_id"])
        except StaffUser.DoesNotExist:
            raise serializers.ValidationError("Invalid request")

        # Find valid verification code
        verification = EmailVerificationCode.objects.filter(
            staff=staff,
            code=attrs["code"],
            device_fingerprint=attrs["device_fingerprint"],
            is_used=False
        ).order_by('-created_at').first()

        if not verification or not verification.is_valid():
            raise serializers.ValidationError("Invalid or expired verification code")

        # Mark as used
        verification.use()

        # Create trusted device
        TrustedDevice.objects.get_or_create(
            staff=staff,
            device_fingerprint=attrs["device_fingerprint"],
            defaults={
                "device_name": "Browser",  # Can be enhanced with user agent parsing
                "expires_at": timezone.now() + timezone.timedelta(days=90),
            }
        )

        attrs["user"] = staff
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Change password with validation."""
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context['request'].user
        forced = getattr(user, "must_change_password", False)

        if not forced:
            current = attrs.get("current_password") or ""
            if not current:
                raise serializers.ValidationError({"current_password": "Current password is required"})
            if not user.check_password(current):
                raise serializers.ValidationError({"current_password": "Current password is incorrect"})

        # Check new password matches confirmation
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})

        # Validate password strength
        if not StaffUser.validate_password_strength(attrs['new_password']):
            raise serializers.ValidationError({
                "new_password": "Password must contain at least 8 characters, "
                "1 uppercase, 1 lowercase, 1 number, and 1 special character"
            })

        return attrs


class PasswordStrengthSerializer(serializers.Serializer):
    """Live password validation for frontend."""
    password = serializers.CharField()

    def validate_password(self, value):
        """Return detailed validation results."""
        result = {
            "valid": False,
            "length": len(value) >= 8,
            "uppercase": any(c.isupper() for c in value),
            "lowercase": any(c.islower() for c in value),
            "number": any(c.isdigit() for c in value),
            "special": any(c in '@$!%*?&' for c in value),
        }
        result["valid"] = all([
            result["length"],
            result["uppercase"],
            result["lowercase"],
            result["number"],
            result["special"],
        ])
        return result


class StaffRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class StaffLogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
