from django.apps import AppConfig


class VerificationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.verification"
    label = "verification"
    verbose_name = "Verification"

    # Phone, email, KYC, business and property badges. Feature 9.

    def ready(self):
        from apps.verification import signals  # noqa: F401
