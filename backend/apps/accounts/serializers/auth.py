import hashlib
import re
import secrets
from datetime import timedelta

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.lockout import normalize_identifier
from apps.accounts.models import AppUser, PasswordResetToken

GENERIC_AUTH_ERROR = "Invalid credentials."
USE_PROVIDER_LOGIN = "use_provider_login"
USE_BUYER_LOGIN = "use_buyer_login"


class WrongAccountType(Exception):
    def __init__(self, account_type: str):
        self.account_type = account_type
        self.code = USE_PROVIDER_LOGIN if account_type == AppUser.ACCOUNT_PROVIDER else USE_BUYER_LOGIN
        self.detail = (
            "This Google or phone account is registered as a service provider. Open the service provider page to sign in."
            if account_type == AppUser.ACCOUNT_PROVIDER
            else "This account is a buyer account. Sign in from the user page."
        )
        super().__init__(self.detail)


def wrong_role_payload(account_type: str) -> dict:
    err = WrongAccountType(account_type)
    return {"detail": err.detail, "code": err.code}


BLOCKED_AUTH_ERROR = (
    "This account is blocked. A NAJIK admin paused it, so you cannot sign in "
    "until they reactivate the account."
)
DEACTIVATED_AUTH_ERROR = (
    "This account is deactivated. A NAJIK admin turned it off, so you cannot use "
    "the app until they activate it again."
)
NEPAL_PHONE = re.compile(r"^(?:\+977)?9\d{9}$")
ROLE_LABEL = {
    AppUser.ACCOUNT_USER: "buyer",
    AppUser.ACCOUNT_PROVIDER: "service provider",
}


def inactive_auth_error(user: AppUser) -> str:
    if getattr(user, "account_status", "") == AppUser.STATUS_DEACTIVATED:
        return DEACTIVATED_AUTH_ERROR
    return BLOCKED_AUTH_ERROR


def identity_taken_message(existing: AppUser, field: str) -> str:
    label = "phone number" if field == "phone" else "email address"
    role = ROLE_LABEL.get(existing.account_type, "user")
    return (
        f"This {label} is already registered as a {role} account. "
        "The same phone or email cannot be used for both a buyer and a service provider. "
        "Sign in to that account, or use a different contact to create a new one."
    )


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\s+", "", value or "")
    if digits.startswith("+977"):
        digits = digits[4:]
    if digits.startswith("977") and len(digits) == 13:
        digits = digits[3:]
    return digits


class AppTokenSerializer:
    @staticmethod
    def for_user(user: AppUser) -> dict:
        refresh = RefreshToken.for_user(user)
        refresh["kind"] = "app"
        refresh["account_type"] = user.account_type
        access = refresh.access_token
        access["kind"] = "app"
        access["account_type"] = user.account_type
        return {
            "access": str(access),
            "refresh": str(refresh),
            "token_type": "bearer",
        }


class AppUserPublicSerializer(serializers.ModelSerializer):
    verification_status = serializers.SerializerMethodField()
    application_id = serializers.SerializerMethodField()
    service_type = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    photo_uri = serializers.SerializerMethodField()
    has_pending_edit = serializers.SerializerMethodField()
    needs_profile = serializers.SerializerMethodField()
    rejection_note = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()
    profile_data = serializers.SerializerMethodField()

    class Meta:
        model = AppUser
        fields = (
            "id",
            "email",
            "phone",
            "full_name",
            "address",
            "account_type",
            "phone_verified",
            "email_verified",
            "needs_profile",
            "verification_status",
            "application_id",
            "service_type",
            "photo_uri",
            "has_pending_edit",
            "rejection_note",
            "contact",
            "profile_data",
            "date_joined",
            "staff_warning",
            "staff_warning_at",
        )
        read_only_fields = fields

    def _app(self, obj: AppUser):
        from django.core.exceptions import ObjectDoesNotExist

        try:
            return obj.provider_application
        except ObjectDoesNotExist:
            return None

    def get_verification_status(self, obj: AppUser) -> str:
        app = self._app(obj)
        if app is None:
            return "none"
        return app.status

    def get_application_id(self, obj: AppUser):
        app = self._app(obj)
        return str(app.id) if app else None

    def get_service_type(self, obj: AppUser):
        app = self._app(obj)
        return app.service_type if app else None

    def get_address(self, obj: AppUser):
        app = self._app(obj)
        if app and app.address:
            return app.address
        return obj.address or ""

    def get_needs_profile(self, obj: AppUser) -> bool:
        if obj.account_type != AppUser.ACCOUNT_USER:
            return False
        if not obj.google_sub:
            return False
        return not bool((obj.full_name or "").strip() and obj.phone and (obj.address or "").strip())

    def get_photo_uri(self, obj: AppUser):
        request = self.context.get("request")
        if not request:
            return None
        app = self._app(obj)
        if app and app.photo:
            if request.path.startswith("/api/admin/"):
                return request.build_absolute_uri(f"/api/admin/verification/applications/{app.id}/file/photo/")
            return request.build_absolute_uri("/api/verification/applications/me/file/photo/")
        if obj.avatar:
            return request.build_absolute_uri("/api/auth/me/photo/")
        return None

    def get_has_pending_edit(self, obj: AppUser):
        app = self._app(obj)
        return bool(app and app.has_pending_profile_edit())

    def get_rejection_note(self, obj: AppUser):
        app = self._app(obj)
        return (app.rejection_note if app else "") or ""

    def get_contact(self, obj: AppUser):
        app = self._app(obj)
        return (app.contact if app else "") or ""

    def get_profile_data(self, obj: AppUser):
        app = self._app(obj)
        return (app.profile_data if app else {}) or {}


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=15)
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128, style={"input_type": "password"})
    account_type = serializers.ChoiceField(choices=AppUser.ACCOUNT_CHOICES)

    def validate_phone(self, value):
        if not value:
            return None
        phone = normalize_phone(value)
        if not re.fullmatch(r"9\d{9}", phone):
            raise serializers.ValidationError("Enter a valid Nepal mobile number.")
        return phone

    def validate_email(self, value):
        if not value:
            return None
        return value.lower().strip()

    def validate(self, attrs):
        email = attrs.get("email") or None
        phone = attrs.get("phone") or None
        if not email and not phone:
            raise serializers.ValidationError("Provide an email or a phone number.")
        if email:
            existing = AppUser.objects.filter(email__iexact=email).first()
            if existing:
                raise serializers.ValidationError({"email": identity_taken_message(existing, "email")})
        if phone:
            existing = AppUser.objects.filter(phone=phone).first()
            if existing:
                raise serializers.ValidationError({"phone": identity_taken_message(existing, "phone")})
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        attrs["email"] = email
        attrs["phone"] = phone
        attrs["username"] = email or phone
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return AppUser.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})
    account_type = serializers.ChoiceField(choices=AppUser.ACCOUNT_CHOICES, required=False)

    def validate(self, attrs):
        raw = attrs["identifier"].strip()
        password = attrs["password"]
        phone = normalize_phone(raw)
        if "@" in raw:
            user = AppUser.objects.filter(email__iexact=raw.lower()).first()
        else:
            user = AppUser.objects.filter(phone=phone).first()
            if user is None:
                user = AppUser.objects.filter(username__iexact=raw).first()

        if user is None or not user.check_password(password):
            raise serializers.ValidationError(GENERIC_AUTH_ERROR)
        if not user.is_active:
            raise serializers.ValidationError(inactive_auth_error(user))
        attrs["user"] = user
        attrs["lock_key"] = normalize_identifier(raw)
        return attrs


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class OtpRequestSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=(("phone", "phone"), ("email", "email")))
    identifier = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context.get("user")
        purpose = attrs["purpose"]
        raw = (attrs.get("identifier") or "").strip()
        if purpose == "phone":
            ident = normalize_phone(raw) if raw else (user.phone if user else "")
            if not ident or not re.fullmatch(r"9\d{9}", ident):
                raise serializers.ValidationError("Enter a valid Nepal mobile number.")
        else:
            ident = (raw or (user.email if user else "") or "").lower()
            if not ident or "@" not in ident:
                raise serializers.ValidationError("Enter a valid email address.")
        attrs["identifier"] = ident
        return attrs


class OtpVerifySerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=(("phone", "phone"), ("email", "email")))
    identifier = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(max_length=8)

    def validate(self, attrs):
        user = self.context.get("user")
        purpose = attrs["purpose"]
        raw = (attrs.get("identifier") or "").strip()
        if purpose == "phone":
            ident = normalize_phone(raw) if raw else (user.phone if user else "")
        else:
            ident = (raw or (user.email if user else "") or "").lower()
        if not ident:
            raise serializers.ValidationError("Missing identifier.")
        attrs["identifier"] = ident
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.UUIDField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


def issue_password_reset(user: AppUser) -> str:
    raw = secrets.token_urlsafe(32)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    PasswordResetToken.objects.filter(user=user, consumed_at__isnull=True).delete()
    PasswordResetToken.objects.create(
        user=user,
        token_hash=digest,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    return raw


def consume_password_reset(user: AppUser, token: str) -> bool:
    digest = hashlib.sha256(token.encode()).hexdigest()
    row = PasswordResetToken.objects.filter(
        user=user,
        token_hash=digest,
        consumed_at__isnull=True,
        expires_at__gt=timezone.now(),
    ).first()
    if row is None:
        return False
    row.consumed_at = timezone.now()
    row.save(update_fields=["consumed_at"])
    return True
