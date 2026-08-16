from django.contrib import admin

from apps.accounts.models import AppUser


@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "phone", "full_name", "is_active", "date_joined")
    search_fields = ("email", "phone", "full_name")
    readonly_fields = ("id", "date_joined")
