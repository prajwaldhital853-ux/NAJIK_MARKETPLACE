from django.apps import AppConfig


class CmsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.cms"
    label = "cms"
    verbose_name = "Cms"

    # FAQ, terms, privacy, banners. Feature 13.
