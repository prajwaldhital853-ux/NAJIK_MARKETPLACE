import uuid

from django.db import models
from django.utils import timezone


class PrivacyRetentionConfig(models.Model):
    """Singleton privacy & data-retention settings (editable from General App Control)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    inactive_account_retention_days = models.PositiveIntegerField(
        default=365,
        help_text="Days to keep deactivated accounts before automated purge (0 = never auto-purge).",
    )
    kyc_retention_days_after_deletion = models.PositiveIntegerField(
        default=730,
        help_text="How long KYC metadata may be retained after account deletion (policy display; files deleted with account).",
    )
    chat_message_retention_days = models.PositiveIntegerField(
        default=365,
        help_text="Delete chat messages older than this many days (0 = keep forever).",
    )
    login_lockout_retention_days = models.PositiveIntegerField(default=90)
    staff_login_attempt_retention_days = models.PositiveIntegerField(default=180)
    otp_retention_days = models.PositiveIntegerField(default=30)
    password_reset_token_retention_days = models.PositiveIntegerField(default=7)
    allow_self_service_export = models.BooleanField(default=True)
    allow_self_service_delete = models.BooleanField(default=True)
    require_password_for_self_delete = models.BooleanField(default=True)
    anonymize_complaint_snapshots_on_delete = models.BooleanField(default=True)
    retention_policy_summary = models.TextField(
        blank=True,
        default=(
            "We retain account data while your account is active. After deletion, some records may be "
            "kept for fraud prevention, legal compliance, and dispute resolution for the periods shown below."
        ),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "privacy & retention config"
        verbose_name_plural = "privacy & retention config"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def as_public_dict(self) -> dict:
        return {
            "summary": self.retention_policy_summary,
            "inactive_account_retention_days": self.inactive_account_retention_days,
            "kyc_retention_days_after_deletion": self.kyc_retention_days_after_deletion,
            "chat_message_retention_days": self.chat_message_retention_days,
            "login_lockout_retention_days": self.login_lockout_retention_days,
            "staff_login_attempt_retention_days": self.staff_login_attempt_retention_days,
            "otp_retention_days": self.otp_retention_days,
            "password_reset_token_retention_days": self.password_reset_token_retention_days,
            "allow_self_service_export": self.allow_self_service_export,
            "allow_self_service_delete": self.allow_self_service_delete,
            "updated_at": self.updated_at,
        }


class LegalDocumentConfig(models.Model):
    """Editable Terms & Privacy content served to the mobile app."""

    DOC_TERMS = "terms"
    DOC_PRIVACY = "privacy"
    DOC_CHOICES = (
        (DOC_TERMS, "Terms & Conditions"),
        (DOC_PRIVACY, "Privacy Policy"),
    )
    ROLE_BUYER = "buyer"
    ROLE_SELLER = "seller"
    ROLE_CHOICES = (
        (ROLE_BUYER, "Buyer"),
        (ROLE_SELLER, "Service provider (seller)"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doc_type = models.CharField(max_length=16, choices=DOC_CHOICES, db_index=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, db_index=True)
    title = models.CharField(max_length=120)
    last_updated_label = models.CharField(max_length=40, blank=True, default="")
    intro = models.TextField(blank=True, default="")
    sections = models.JSONField(default=list, blank=True)
    footer = models.TextField(blank=True, default="")
    version = models.PositiveIntegerField(default=1)
    is_published = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("doc_type", "role")]
        ordering = ["doc_type", "role"]

    def __str__(self):
        return f"{self.get_doc_type_display()} ({self.get_role_display()})"

    def as_public_dict(self) -> dict:
        return {
            "id": self.doc_type,
            "title": self.title,
            "lastUpdated": self.last_updated_label or timezone.localdate().strftime("%d %B %Y"),
            "intro": self.intro,
            "sections": self.sections or [],
            "footer": self.footer,
            "version": self.version,
            "role": self.role,
        }

    def as_admin_dict(self) -> dict:
        payload = self.as_public_dict()
        payload.update(
            {
                "doc_type": self.doc_type,
                "role": self.role,
                "is_published": self.is_published,
                "updated_at": self.updated_at,
                "published_at": self.published_at,
            }
        )
        return payload


class DataSubjectRequestLog(models.Model):
    """Audit log for GDPR-style export and deletion requests."""

    ACTION_EXPORT = "export"
    ACTION_DELETE = "delete"
    ACTION_RETENTION_PURGE = "retention_purge"
    ACTION_CHOICES = (
        (ACTION_EXPORT, "Export"),
        (ACTION_DELETE, "Delete"),
        (ACTION_RETENTION_PURGE, "Retention purge"),
    )
    SOURCE_SELF = "self"
    SOURCE_STAFF = "staff"
    SOURCE_SYSTEM = "system"
    SOURCE_CHOICES = (
        (SOURCE_SELF, "User self-service"),
        (SOURCE_STAFF, "Staff admin"),
        (SOURCE_SYSTEM, "Automated retention job"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    source = models.CharField(max_length=16, choices=SOURCE_CHOICES)
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    user_email = models.CharField(max_length=254, blank=True, default="")
    user_phone = models.CharField(max_length=20, blank=True, default="")
    staff = models.ForeignKey(
        "staff.StaffUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="data_subject_logs",
    )
    detail = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
