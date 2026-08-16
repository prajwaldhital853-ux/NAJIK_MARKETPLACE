import re

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AppUser

GENERIC_AUTH_ERROR = "Invalid credentials."
NEPAL_PHONE = re.compile(r"^(?:\+977)?9\d{9}$")


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\s+", "", value or "")
    if digits.startswith("+977"):
        digits = digits[4:]
    return digits


class AppTokenSerializer:
    @staticmethod
    def for_user(user: AppUser) -> dict:
        refresh = RefreshToken.for_user(user)
        refresh["kind"] = "app"
        access = refresh.access_token
        access["kind"] = "app"
        return {
            "access": str(access),
            "refresh": str(refresh),
            "token_type": "bearer",
        }


class AppUserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        fields = (
            "id",
            "email",
            "phone",
            "full_name",
            "phone_verified",
            "email_verified",
            "date_joined",
        )
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=15)
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128, style={"input_type": "password"})

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
        if email and AppUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Unable to create this account.")
        if phone and AppUser.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Unable to create this account.")
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

        if user is None or not user.check_password(password) or not user.is_active:
            raise serializers.ValidationError(GENERIC_AUTH_ERROR)
        attrs["user"] = user
        return attrs


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
