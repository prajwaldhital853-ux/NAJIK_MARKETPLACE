from django.contrib import admin

from apps.reports.models import Complaint


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "severity", "status", "reporter", "accused", "created_at")
    list_filter = ("kind", "severity", "status")
    search_fields = ("reason", "admin_note")
