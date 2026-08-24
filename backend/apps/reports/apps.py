from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.reports"
    label = "reports"
    verbose_name = "Reports"

    # Scam, spam, and safety queue. Feature 10.

    def ready(self):
        from apps.reports import signals  # noqa: F401
