from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.tokens import Token

from apps.staff.models import StaffUser


class StaffJWTAuthentication(JWTAuthentication):
    """Accepts only JWTs minted for StaffUser. App tokens are rejected."""

    def get_user(self, validated_token: Token):
        if validated_token.get("kind") != "staff":
            raise AuthenticationFailed("Invalid token.", code="invalid_token")
        user_id = validated_token.get("user_id")
        if not user_id:
            raise InvalidToken("Token contained no recognizable user identification")
        try:
            staff = StaffUser.objects.get(pk=user_id)
        except StaffUser.DoesNotExist as exc:
            raise AuthenticationFailed("Invalid token.", code="user_not_found") from exc
        if not staff.is_active:
            raise AuthenticationFailed("Invalid token.", code="user_inactive")
        return staff
