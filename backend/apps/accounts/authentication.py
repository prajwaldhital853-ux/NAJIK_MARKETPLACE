from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings

from apps.accounts.serializers.auth import inactive_auth_error


class AppJWTAuthentication(JWTAuthentication):
    """Accepts only JWTs minted for marketplace AppUser accounts."""

    def get_user(self, validated_token):
        if validated_token.get("kind") != "app":
            raise AuthenticationFailed("Invalid token.", code="invalid_token")
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
            user = self.user_model.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except (KeyError, self.user_model.DoesNotExist) as exc:
            raise AuthenticationFailed("Invalid token.", code="invalid_token") from exc
        except InvalidToken as exc:
            raise AuthenticationFailed("Invalid token.", code="invalid_token") from exc
        if not user.is_active:
            code = "user_deactivated" if getattr(user, "account_status", "") == "deactivated" else "user_blocked"
            raise AuthenticationFailed(inactive_auth_error(user), code=code)
        return user


class OptionalAppJWTAuthentication(AppJWTAuthentication):
    """AllowAny views: a missing or expired Bearer token is treated as anonymous."""

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (AuthenticationFailed, InvalidToken):
            return None
