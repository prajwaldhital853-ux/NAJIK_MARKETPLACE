from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", include("apps.core.urls")),
    path("api/branding/", include("apps.core.branding_urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/admin/auth/", include("apps.staff.urls")),
    path("api/verification/", include("apps.verification.urls")),
    path("api/admin/verification/", include("apps.verification.staff_urls")),
    path("api/cards/", include("apps.verification.card_urls")),
    path("api/admin/users/", include("apps.accounts.staff_urls")),
    path("api/listings/", include("apps.listings.urls")),
    path("api/admin/listings/", include("apps.listings.staff_urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/admin/chat/", include("apps.chat.staff_urls")),
    path("api/notices/", include("apps.notifications.urls")),
    path("api/admin/notices/", include("apps.notifications.staff_urls")),
]
