"""
Production-grade RBAC models with custom role support.
Supports granular page-level permissions with audit trail.
"""
import uuid
from django.db import models
from django.utils import timezone


class Role(models.Model):
    """
    Staff roles with hierarchical permissions.
    Supports both predefined and custom roles.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    is_system_role = models.BooleanField(
        default=False,
        help_text="System roles (Super Admin, Admin, etc.) cannot be deleted"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        "staff.StaffUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_roles"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_system_role", "name"]

    def __str__(self):
        return self.name


class Permission(models.Model):
    """
    Granular page-level permissions for admin panel.
    """
    # Page/Section identifiers
    DASHBOARD = "dashboard"
    USER_MANAGEMENT = "user_management"
    PROPERTY_MANAGEMENT = "property_management"
    JOB_MANAGEMENT = "job_management"
    SERVICE_MANAGEMENT = "service_management"
    ELECTRONICS_MANAGEMENT = "electronics_management"
    OTHER_LISTINGS = "other_listings"
    ORDERS_BOOKINGS = "orders_bookings"
    SELLER_PAYMENTS = "seller_payments"
    KYC_VERIFICATION = "kyc_verification"
    REPORTS_COMPLAINTS = "reports_complaints"
    REVIEWS_RATINGS = "reviews_ratings"
    NOTIFICATIONS = "notifications"
    ADS_PROMOTIONS = "ads_promotions"
    ANALYTICS = "analytics"
    APP_CONTROL = "app_control"
    STAFF_MANAGEMENT = "staff_management"
    SETTINGS = "settings"

    PAGE_CHOICES = [
        (DASHBOARD, "Dashboard"),
        (USER_MANAGEMENT, "User Management"),
        (PROPERTY_MANAGEMENT, "Property Management"),
        (JOB_MANAGEMENT, "Job Management"),
        (SERVICE_MANAGEMENT, "Service Management"),
        (ELECTRONICS_MANAGEMENT, "Electronics Management"),
        (OTHER_LISTINGS, "Other Listings"),
        (ORDERS_BOOKINGS, "Orders & Bookings"),
        (SELLER_PAYMENTS, "Seller Payments"),
        (KYC_VERIFICATION, "KYC / Verification"),
        (REPORTS_COMPLAINTS, "Reports & Complaints"),
        (REVIEWS_RATINGS, "Reviews & Ratings"),
        (NOTIFICATIONS, "Notifications"),
        (ADS_PROMOTIONS, "Advertisements / Promotions"),
        (ANALYTICS, "Analytics"),
        (APP_CONTROL, "General App Control"),
        (STAFF_MANAGEMENT, "Admin & Staff Management"),
        (SETTINGS, "Settings"),
    ]

    # Actions
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

    ACTION_CHOICES = [
        (VIEW, "View"),
        (CREATE, "Create"),
        (UPDATE, "Update"),
        (DELETE, "Delete"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    page = models.CharField(max_length=50, choices=PAGE_CHOICES, db_index=True, null=True, blank=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["page", "action"]
        unique_together = [("page", "action")]

    def __str__(self):
        return f"{self.get_page_display()} - {self.get_action_display()}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"{self.page}.{self.action}"
        super().save(*args, **kwargs)


class RolePermission(models.Model):
    """
    Many-to-many relationship between roles and permissions.
    Includes audit trail for security compliance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name="role_assignments")
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        "staff.StaffUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+"
    )

    class Meta:
        unique_together = [("role", "permission")]
        ordering = ["role", "permission"]

    def __str__(self):
        return f"{self.role.name} → {self.permission.code}"


class StaffPermission(models.Model):
    """
    Individual permission overrides for staff members.
    Can grant or deny specific permissions, overriding role permissions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        "staff.StaffUser",
        on_delete=models.CASCADE,
        related_name="individual_permissions"
    )
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    is_granted = models.BooleanField(
        default=True,
        help_text="False = explicitly deny this permission"
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        "staff.StaffUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiry for temporary permissions"
    )

    class Meta:
        unique_together = [("staff", "permission")]
        ordering = ["staff", "permission"]

    def __str__(self):
        action = "Grant" if self.is_granted else "Deny"
        return f"{action}: {self.staff.email} → {self.permission.code}"

    def is_valid(self):
        """Check if permission override is still valid."""
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
