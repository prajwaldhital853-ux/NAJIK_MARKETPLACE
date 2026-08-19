import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models import Q


class AppUserManager(BaseUserManager):
    def create_user(self, password=None, **extra_fields):
        email = extra_fields.get("email")
        if email:
            extra_fields["email"] = self.normalize_email(email)
        if not extra_fields.get("email") and not extra_fields.get("phone"):
            raise ValueError("An email or phone number is required.")
        if not extra_fields.get("username"):
            extra_fields["username"] = extra_fields.get("email") or extra_fields.get("phone")
        user = self.model(**extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(password=password, **extra_fields)


class AppUser(AbstractBaseUser, PermissionsMixin):
    """Marketplace buyer or seller. Not staff. Cannot access /api/admin/*."""

    ACCOUNT_USER = "user"
    ACCOUNT_PROVIDER = "provider"
    ACCOUNT_CHOICES = (
        (ACCOUNT_USER, "Buyer"),
        (ACCOUNT_PROVIDER, "Service provider"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=15, unique=True, null=True, blank=True)
    google_sub = models.CharField(max_length=64, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=150, blank=True)
    account_type = models.CharField(max_length=16, choices=ACCOUNT_CHOICES, default=ACCOUNT_USER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    avatar = models.FileField(upload_to="avatars/", blank=True)
    STATUS_ACTIVE = "active"
    STATUS_BLOCKED = "blocked"
    STATUS_DEACTIVATED = "deactivated"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_BLOCKED, "Blocked"),
        (STATUS_DEACTIVATED, "Deactivated"),
    )
    account_status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    objects = AppUserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(email__isnull=False) | Q(phone__isnull=False),
                name="accounts_appuser_email_or_phone",
            ),
        ]

    def __str__(self):
        return self.email or self.phone or str(self.id)
