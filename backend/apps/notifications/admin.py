from django.contrib import admin

from apps.notifications.models import AppNotice


@admin.register(AppNotice)
class AppNoticeAdmin(admin.ModelAdmin):
    list_display = ("title", "audience", "is_active", "created_at")
    list_filter = ("audience", "is_active")
    search_fields = ("title", "body")
