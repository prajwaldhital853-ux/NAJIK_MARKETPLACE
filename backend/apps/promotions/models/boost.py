import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class BoostCampaign(models.Model):
    """Seller-paid listing boost with category-scoped rotation."""

    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_EXPIRED = "expired"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAUSED, "Paused"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.CASCADE,
        related_name="boost_campaigns",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="boost_campaigns",
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    duration_days = models.PositiveIntegerField()
    price_paid_paisa = models.PositiveBigIntegerField()
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    
    # Category for scoped rotation
    category = models.CharField(max_length=20)
    
    # Rotation state (updated every ~30min)
    current_slot = models.PositiveSmallIntegerField(default=0)
    last_rotation_at = models.DateTimeField(default=timezone.now)
    total_rotations = models.PositiveIntegerField(default=0)
    
    # Analytics
    impression_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    inquiry_count = models.PositiveIntegerField(default=0)
    last_impression_at = models.DateTimeField(null=True, blank=True)
    
    # Admin controls
    admin_paused_reason = models.TextField(blank=True, default="")
    admin_extended_hours = models.PositiveIntegerField(default=0)
    reviewed_by = models.ForeignKey(
        "staff.StaffUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="boost_reviews",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "category", "ends_at"]),
            models.Index(fields=["listing", "status"]),
            models.Index(fields=["seller", "status"]),
        ]

    def __str__(self):
        return f"boost:{self.listing_id} ({self.duration_days}d, {self.status})"

    @property
    def is_active(self) -> bool:
        return (
            self.status == self.STATUS_ACTIVE
            and self.starts_at <= timezone.now() < self.ends_at
        )

    @property
    def days_remaining(self) -> int:
        if not self.is_active:
            return 0
        delta = self.ends_at - timezone.now()
        return max(0, int(delta.total_seconds() / 86400))

    @property
    def hours_remaining(self) -> int:
        if not self.is_active:
            return 0
        delta = self.ends_at - timezone.now()
        return max(0, int(delta.total_seconds() / 3600))

    def calculate_priority_score(self) -> float:
        """Higher score = better position. Factors: duration, time remaining, rotation fairness."""
        if not self.is_active:
            return 0.0
        
        # Base: longer campaigns get slight boost
        duration_weight = min(self.duration_days / 15.0, 1.5)
        
        # Rotation fairness: distribute slots over time
        rotation_penalty = min(self.total_rotations / 100.0, 0.3)
        
        # Time remaining: campaigns near end get small boost to maximize their value
        hours_left = self.hours_remaining
        urgency_boost = 0.1 if hours_left < 24 else 0.0
        
        return duration_weight - rotation_penalty + urgency_boost


class BoostPricing(models.Model):
    """Admin-controlled boost pricing tiers."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    
    # Pricing per duration
    boost_3d_rupees = models.PositiveIntegerField(default=50)
    boost_7d_rupees = models.PositiveIntegerField(default=100)
    boost_14d_rupees = models.PositiveIntegerField(default=180)
    boost_30d_rupees = models.PositiveIntegerField(default=300)
    
    # Platform limits
    max_active_boosts_per_seller = models.PositiveIntegerField(default=3)
    max_active_boosts_per_category = models.PositiveIntegerField(default=20)
    max_active_boosts_platform = models.PositiveIntegerField(default=100)
    
    # Rotation settings
    rotation_interval_minutes = models.PositiveIntegerField(default=30)
    max_slots_per_category_feed = models.PositiveIntegerField(default=5)
    
    # View multiplier for seller confidence (show 1 view as N views)
    seller_view_multiplier = models.PositiveIntegerField(default=5)
    
    # Estimated metrics for UI
    est_views_per_day_3d = models.PositiveIntegerField(default=50)
    est_views_per_day_7d = models.PositiveIntegerField(default=45)
    est_views_per_day_14d = models.PositiveIntegerField(default=40)
    est_views_per_day_30d = models.PositiveIntegerField(default=35)
    
    est_inquiries_per_100_views = models.PositiveIntegerField(default=5)
    
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "boost pricing"
        verbose_name_plural = "boost pricing"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def get_price_for_duration(self, days: int) -> int:
        """Returns price in rupees for given duration."""
        if days <= 3:
            return self.boost_3d_rupees
        elif days <= 7:
            return self.boost_7d_rupees
        elif days <= 14:
            return self.boost_14d_rupees
        else:
            return self.boost_30d_rupees

    def get_estimated_views(self, days: int) -> int:
        """Total estimated views for duration."""
        if days <= 3:
            return self.est_views_per_day_3d * days
        elif days <= 7:
            return self.est_views_per_day_7d * days
        elif days <= 14:
            return self.est_views_per_day_14d * days
        else:
            return self.est_views_per_day_30d * days

    def get_estimated_inquiries(self, days: int) -> int:
        """Total estimated inquiries for duration."""
        views = self.get_estimated_views(days)
        return max(1, (views * self.est_inquiries_per_100_views) // 100)
