from rest_framework import serializers

from apps.accounts.models import AppUser
from apps.listings.models import Listing
from apps.reports.models import Complaint


def party_snapshot(user: AppUser | None) -> dict:
    if not user:
        return {}
    return {
        "id": str(user.id),
        "full_name": user.full_name or "",
        "account_type": user.account_type,
        "phone": user.phone,
        "email": user.email,
        "is_active": user.is_active,
        "account_status": user.account_status,
        "staff_warning": user.staff_warning or "",
        "staff_warning_at": user.staff_warning_at.isoformat() if user.staff_warning_at else None,
    }


def listing_snapshot(listing: Listing | None) -> dict:
    if not listing:
        return {}
    return {
        "id": str(listing.id),
        "title": listing.title,
        "price": str(listing.price) if listing.price is not None else "",
        "location": listing.location or "",
        "owner_id": str(listing.owner_id) if listing.owner_id else None,
        "status": listing.status,
    }


class ComplaintCreateSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["user", "listing", "chat"])
    severity = serializers.ChoiceField(choices=["normal", "high"], default="normal")
    reason = serializers.CharField(min_length=8, max_length=2000)
    accused_id = serializers.UUIDField(required=False, allow_null=True)
    listing_id = serializers.UUIDField(required=False, allow_null=True)
    thread_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        kind = attrs["kind"]
        if kind == "user" and not attrs.get("accused_id"):
            raise serializers.ValidationError({"accused_id": "Select the user you are reporting."})
        if kind == "listing" and not attrs.get("listing_id"):
            raise serializers.ValidationError({"listing_id": "Select the listing you are reporting."})
        if kind == "chat" and not attrs.get("thread_id"):
            raise serializers.ValidationError({"thread_id": "Chat thread is required."})
        return attrs


class ComplaintSerializer(serializers.ModelSerializer):
    reporter = serializers.SerializerMethodField()
    accused = serializers.SerializerMethodField()
    listing = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = (
            "id",
            "kind",
            "severity",
            "status",
            "reason",
            "reporter",
            "accused",
            "listing",
            "chat_thread_id",
            "chat_report_id",
            "transcript",
            "listing_snapshot",
            "reporter_snapshot",
            "accused_snapshot",
            "admin_note",
            "warning_sent_to",
            "warning_message",
            "created_at",
            "updated_at",
            "resolved_at",
        )
        read_only_fields = fields

    def get_reporter(self, obj):
        return party_snapshot(obj.reporter)

    def get_accused(self, obj):
        return party_snapshot(obj.accused)

    def get_listing(self, obj):
        return obj.listing_snapshot or listing_snapshot(obj.listing)
