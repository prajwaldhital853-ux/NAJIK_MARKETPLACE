from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"


class RegisterRateThrottle(AnonRateThrottle):
    scope = "register"


class OtpRateThrottle(UserRateThrottle):
    scope = "otp"


class OtpAnonRateThrottle(AnonRateThrottle):
    scope = "otp"


class SellerApplyRateThrottle(UserRateThrottle):
    scope = "seller_apply"


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = "password_reset"


class GoogleAuthRateThrottle(AnonRateThrottle):
    scope = "google"
