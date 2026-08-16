from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", include("apps.core.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/admin/auth/", include("apps.staff.urls")),
]
