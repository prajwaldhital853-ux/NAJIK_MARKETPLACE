from django.apps import AppConfig


class CategoriesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.categories"
    label = "categories"
    verbose_name = "Categories"

    # Category and subcategory trees. Models come in Feature 3.
