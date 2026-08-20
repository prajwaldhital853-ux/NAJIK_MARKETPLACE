import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Complaint(models.Model):
    """Unified reports: user-vs-user, listing, or chat-backed complaints."""

    KIND_USER = "user"
    KIND_LISTING = "listing"
    KIND_CHAT = "chat"
    KIND_CHOICES = (
        (KIND_USER, "User report"),
        (KIND_LISTING, "Listing report"),
        (KIND_CHAT, "Chat report"),
    )

    SEVERITY_NORMAL = "normal"
    SEVERITY_HIGH = "high"
    SEVERITY_CHOICES = (
        (SEVERITY_NORMAL, "Normal"),
        (SEVERITY_HIGH, "High"),
    )

    STATUS_OPEN = "open"
    STATUS_UNDER_REVIEW = "under_review"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_UNDER_REVIEW, "Under review"),
        (STATUS_RESOLVED, "Resolved"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    severity = models.CharField(max_length=12, choices=SEVERITY_CHOICES, default=SEVERITY_NORMAL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    reason = models.TextField()
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints_filed",
    )
    accused = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints_against",
    )
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    chat_thread = models.ForeignKey(
        "chat.ChatThread",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    chat_report = models.ForeignKey(
        "chat.ChatReport",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    transcript = models.JSONField(default=list, blank=True)
    listing_snapshot = models.JSONField(default=dict, blank=True)
    reporter_snapshot = models.JSONField(default=dict, blank=True)
    accused_snapshot = models.JSONField(default=dict, blank=True)
    admin_note = models.TextField(blank=True, default="")
    warning_sent_to = models.CharField(max_length=20, blank=True, default="")  # reporter|accused|both|""
    warning_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind}/{self.severity} ({self.status})"

    def mark_resolved(self):
        self.status = self.STATUS_RESOLVED
        self.resolved_at = timezone.now()
        self.save(update_fields=["status", "resolved_at", "updated_at"])
