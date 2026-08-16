from django.apps import AppConfig


class ListingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.listings"
    label = "listings"
    verbose_name = "Listings"

    # Posts for property, vehicles, used items. Feature 4.
