from django.contrib import admin

from apps.staff.models import StaffUser


@admin.register(StaffUser)
class StaffUserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "full_name", "is_active", "is_super_admin", "date_joined")
    search_fields = ("email", "full_name")
    readonly_fields = ("id", "password", "date_joined", "last_login")
