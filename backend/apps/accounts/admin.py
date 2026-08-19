from django.contrib import admin

from apps.accounts.models import AppUser, LoginLockout, OneTimePassword


@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "phone", "full_name", "account_type", "is_active", "date_joined")
    search_fields = ("email", "phone", "full_name")
    readonly_fields = ("id", "date_joined")
    list_filter = ("account_type", "is_active")


@admin.register(LoginLockout)
class LoginLockoutAdmin(admin.ModelAdmin):
    list_display = ("identifier", "fail_count", "locked_until")
    search_fields = ("identifier",)


@admin.register(OneTimePassword)
class OneTimePasswordAdmin(admin.ModelAdmin):
    list_display = ("identifier", "purpose", "expires_at", "consumed_at")
    search_fields = ("identifier",)
