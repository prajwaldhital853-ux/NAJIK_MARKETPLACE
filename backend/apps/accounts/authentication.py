from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken


class AppJWTAuthentication(JWTAuthentication):
    """Accepts only JWTs minted for marketplace AppUser accounts."""

    def get_user(self, validated_token):
        if validated_token.get("kind") != "app":
            raise AuthenticationFailed("Invalid token.", code="invalid_token")
        try:
            return super().get_user(validated_token)
        except InvalidToken as exc:
            raise AuthenticationFailed("Invalid token.", code="invalid_token") from exc
