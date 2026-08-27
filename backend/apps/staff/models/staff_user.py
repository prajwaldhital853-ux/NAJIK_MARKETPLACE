"""
Enhanced StaffUser model with security features:
- Password history tracking
- Login attempt monitoring
- Device verification
- Session management
"""
import uuid
import re
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


PASSWORD_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
)


class StaffUser(models.Model):
    """
    Staff/Admin user with role-based access control.
    Security features: password history, login attempts, MFA support.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    password = models.CharField(max_length=128)
    full_name = models.CharField(max_length=150, blank=True)
    
    # Role-based access
    role = models.ForeignKey(
        "Role", on_delete=models.PROTECT, null=True, blank=True, related_name="staff_users"
    )
    
    # Status flags
    is_active = models.BooleanField(default=True, db_index=True)
    is_super_admin = models.BooleanField(default=False, db_index=True)
    must_change_password = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    # Security metadata
    failed_login_attempts = models.IntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)
    last_password_change = models.DateTimeField(null=True, blank=True)
    password_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Audit trail
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "staff user"
        ordering = ["-date_joined"]

    def __str__(self):
        return self.email

    def set_password(self, raw_password: str) -> None:
        """Set password with validation and history tracking."""
        if not self.validate_password_strength(raw_password):
            raise ValueError(
                "Password must contain at least 8 characters, "
                "1 uppercase, 1 lowercase, 1 number, and 1 special character"
            )
        
        # Check password history (prevent reuse)
        if self.pk:
            recent_passwords = PasswordHistory.objects.filter(
                staff=self
            ).order_by("-changed_at")[:5]
            
            for history in recent_passwords:
                if check_password(raw_password, history.password_hash):
                    raise ValueError("Cannot reuse a recent password")
        
        self.password = make_password(raw_password)
        self.last_password_change = timezone.now()
        self.must_change_password = False
        
        # Save password to history
        if self.pk:
            PasswordHistory.objects.create(
                staff=self,
                password_hash=self.password
            )

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.password)

    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """
        Validate password meets requirements:
        - At least 8 characters
        - 1 uppercase letter
        - 1 lowercase letter
        - 1 number
        - 1 special character
        """
        return bool(PASSWORD_REGEX.match(password))

    def is_account_locked(self) -> bool:
        """Check if account is currently locked."""
        if not self.is_locked:
            return False
        if self.locked_until and timezone.now() > self.locked_until:
            # Auto-unlock if lock period expired
            self.is_locked = False
            self.locked_until = None
            self.failed_login_attempts = 0
            self.save(update_fields=["is_locked", "locked_until", "failed_login_attempts"])
            return False
        return True

    def record_failed_login(self):
        """Legacy audit counter only — login lockout is IP/device scoped via StaffLoginLockout."""
        self.failed_login_attempts += 1
        self.last_failed_login = timezone.now()
        self.save(update_fields=["failed_login_attempts", "last_failed_login"])

    def record_successful_login(self):
        """Reset failed attempts on successful login."""
        self.failed_login_attempts = 0
        self.last_failed_login = None
        self.last_login = timezone.now()
        self.save(update_fields=["failed_login_attempts", "last_failed_login", "last_login"])

    def has_permission(self, permission_code: str) -> bool:
        """
        Check if staff has a specific permission.
        Priority: direct staff permissions > role permissions > super admin
        """
        if self.is_super_admin:
            return True
        
        if not self.is_active or self.is_locked:
            return False
        
        # Check direct staff permissions (can grant or deny)
        staff_perm = self.individual_permissions.filter(
            permission__code=permission_code
        ).first()
        
        if staff_perm and staff_perm.is_valid():
            return staff_perm.is_granted
        
        # Check role permissions
        if self.role and self.role.is_active:
            return self.role.role_permissions.filter(
                permission__code=permission_code
            ).exists()
        
        return False

    def get_all_permissions(self) -> set:
        """Get set of all permission codes this staff has."""
        if self.is_super_admin:
            from apps.staff.models.role import Permission
            return set(Permission.objects.values_list("code", flat=True))
        
        permissions = set()
        
        # Add role permissions
        if self.role and self.role.is_active:
            permissions.update(
                self.role.role_permissions.values_list("permission__code", flat=True)
            )
        
        # Add/remove direct staff permissions
        for staff_perm in self.individual_permissions.select_related("permission").all():
            if staff_perm.is_valid():
                if staff_perm.is_granted:
                    permissions.add(staff_perm.permission.code)
                else:
                    permissions.discard(staff_perm.permission.code)
        
        return permissions

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False


class PasswordHistory(models.Model):
    """
    Track password history to prevent reuse.
    Keeps last 5 passwords per staff.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(StaffUser, on_delete=models.CASCADE, related_name="password_history")
    password_hash = models.CharField(max_length=128)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]
        verbose_name_plural = "password histories"

    def __str__(self):
        return f"{self.staff.email} password change at {self.changed_at}"


class StaffLoginLockout(models.Model):
    """
    Tracks failed staff login attempts per email + client IP.
    All browsers on the same network for that staff email share the lockout window.
    Other staff on the same WiFi are not affected (email is part of the key).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lock_key = models.CharField(max_length=512, unique=True, db_index=True)
    email = models.EmailField(db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_fingerprint = models.CharField(max_length=255, blank=True, default="")
    fail_count = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True, db_index=True)
    last_failed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.email} @ {self.ip_address or 'unknown'}"


class LoginAttempt(models.Model):
    """
    Audit log of all login attempts (successful and failed).
    Used for security monitoring and device verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        StaffUser, on_delete=models.CASCADE, null=True, blank=True, related_name="login_attempts"
    )
    email = models.EmailField()
    success = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_fingerprint = models.CharField(max_length=255, blank=True, db_index=True)
    location = models.CharField(max_length=255, blank=True)  # City, Country from IP
    attempted_at = models.DateTimeField(auto_now_add=True, db_index=True)
    failure_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-attempted_at"]
        indexes = [
            models.Index(fields=["staff", "-attempted_at"]),
            models.Index(fields=["email", "-attempted_at"]),
        ]

    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.email} at {self.attempted_at}"


class TrustedDevice(models.Model):
    """
    Trusted devices that don't require email verification.
    Auto-created on first successful login from a new device after email verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(StaffUser, on_delete=models.CASCADE, related_name="trusted_devices")
    device_fingerprint = models.CharField(max_length=255, db_index=True)
    device_name = models.CharField(max_length=255, blank=True)  # e.g., "Chrome on Windows"
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Auto-expire after 90 days

    class Meta:
        ordering = ["-last_used_at"]
        unique_together = [["staff", "device_fingerprint"]]

    def __str__(self):
        return f"{self.staff.email} - {self.device_name}"

    def is_valid(self) -> bool:
        """Check if device trust is still valid."""
        return timezone.now() < self.expires_at

    def touch(self):
        """Update last_used_at timestamp."""
        self.last_used_at = timezone.now()
        self.save(update_fields=["last_used_at"])


class EmailVerificationCode(models.Model):
    """
    One-time codes for email verification when logging in from new device.
    Expires after 10 minutes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(StaffUser, on_delete=models.CASCADE, related_name="verification_codes")
    code = models.CharField(max_length=6, db_index=True)  # 6-digit code
    device_fingerprint = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.staff.email} - {self.code}"

    def is_valid(self) -> bool:
        """Check if code is still valid."""
        return not self.is_used and timezone.now() < self.expires_at

    def use(self):
        """Mark code as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=["is_used", "used_at"])
