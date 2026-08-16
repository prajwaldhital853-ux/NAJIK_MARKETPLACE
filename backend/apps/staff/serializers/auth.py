from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.staff.models import StaffUser

GENERIC_AUTH_ERROR = "Invalid credentials."


class StaffTokenSerializer:
    @staticmethod
    def for_user(user: StaffUser) -> dict:
        refresh = RefreshToken()
        refresh["user_id"] = str(user.id)
        refresh["kind"] = "staff"
        access = refresh.access_token
        access["kind"] = "staff"
        access["user_id"] = str(user.id)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return {
            "access": str(access),
            "refresh": str(refresh),
            "token_type": "bearer",
        }


class StaffPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffUser
        fields = (
            "id",
            "email",
            "full_name",
            "is_super_admin",
            "must_change_password",
            "date_joined",
        )
        read_only_fields = fields


class StaffLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        password = attrs["password"]
        staff = StaffUser.objects.filter(email__iexact=email).first()
        if staff is None or not staff.check_password(password) or not staff.is_active:
            raise serializers.ValidationError(GENERIC_AUTH_ERROR)
        attrs["user"] = staff
        return attrs


class StaffRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class StaffLogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
