from django.contrib import admin

from apps.verification.models import ProviderApplication


@admin.register(ProviderApplication)
class ProviderApplicationAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone", "service_type", "status", "created_at")
    list_filter = ("status", "service_type")
    search_fields = ("full_name", "email", "phone")
    readonly_fields = ("id", "created_at", "reviewed_at")
