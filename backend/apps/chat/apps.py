from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.chat"
    label = "chat"
    verbose_name = "Chat"

    # Buyer-seller chat, report, and block. Feature 7.
