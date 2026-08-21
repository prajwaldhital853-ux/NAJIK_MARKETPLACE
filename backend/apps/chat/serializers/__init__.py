import base64
import re
import uuid
from datetime import timedelta

from django.core.files.base import ContentFile
from django.utils import timezone
from rest_framework import serializers

from apps.chat.models import ChatBlock, ChatMessage, ChatThread
from apps.listings.models import Listing
from apps.listings.serializers import file_from_data_uri

ONLINE_WINDOW = timedelta(seconds=45)
MAX_VOICE_BYTES = 4 * 1024 * 1024
AUDIO_URI = re.compile(
    r"^data:(?:audio/(mpeg|mp4|m4a|aac|webm|wav|x-m4a|mp3|3gpp|3gp|amr|ogg|opus|x-caf|caf)|application/octet-stream);base64,([A-Za-z0-9+/=\s]+)$",
    re.I,
)
AUDIO_URI_BARE = re.compile(r"^data:(?:application/octet-stream)?;base64,([A-Za-z0-9+/=\s]+)$", re.I)

QUICK_REPLIES = [
    "Is this still available?",
    "What's the last price?",
    "Can we meet today?",
    "Where can we meet?",
]


def user_is_online(user) -> bool:
    if not user or not user.last_seen:
        return False
    return timezone.now() - user.last_seen <= ONLINE_WINDOW


def public_party(user, request):
    return {
        "id": str(user.id),
        "full_name": user.full_name or "NAJIK user",
        "account_type": user.account_type,
        "last_seen": user.last_seen.isoformat() if user.last_seen else None,
        "online": user_is_online(user),
    }


def admin_party(user):
    return {
        "id": str(user.id),
        "full_name": user.full_name or "NAJIK user",
        "account_type": user.account_type,
        "phone": user.phone,
        "email": user.email,
        "is_active": user.is_active,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
    }


def listing_photo_url(listing, request):
    if not listing or not request:
        return None
    photo = listing.photos.filter(is_pending=False).order_by("sort_order").first()
    if not photo:
        return None
    return request.build_absolute_uri(f"/api/listings/{listing.id}/photos/{photo.id}/")


def file_from_audio_uri(value: str) -> ContentFile:
    raw_value = (value or "").strip()
    match = AUDIO_URI.match(raw_value)
    ext = "m4a"
    if match:
        try:
            raw = base64.b64decode(re.sub(r"\s+", "", match.group(2)), validate=True)
        except Exception as exc:
            raise serializers.ValidationError("Invalid audio data.") from exc
        ext = (match.group(1) or "m4a").lower()
    else:
        bare = AUDIO_URI_BARE.match(raw_value)
        if not bare:
            raise serializers.ValidationError("Upload an audio voice note.")
        try:
            raw = base64.b64decode(re.sub(r"\s+", "", bare.group(1)), validate=True)
        except Exception as exc:
            raise serializers.ValidationError("Invalid audio data.") from exc
    if len(raw) > MAX_VOICE_BYTES:
        raise serializers.ValidationError("Voice notes must be 4 MB or smaller.")
    ext = (
        ext.replace("x-m4a", "m4a")
        .replace("mpeg", "mp3")
        .replace("mp4", "m4a")
        .replace("3gpp", "3gp")
        .replace("x-caf", "caf")
        .replace("octet-stream", "m4a")
    )
    if ext not in {"mp3", "m4a", "aac", "webm", "wav", "3gp", "amr", "ogg", "opus", "caf"}:
        ext = "m4a"
    return ContentFile(raw, name=f"voice_{uuid.uuid4().hex[:8]}.{ext}")


def pair_blocked(a, b) -> bool:
    return ChatBlock.objects.filter(blocker=a, blocked=b).exists() or ChatBlock.objects.filter(blocker=b, blocked=a).exists()


class ChatMessageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    voice_url = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = (
            "id",
            "kind",
            "text",
            "lat",
            "lng",
            "location_label",
            "created_at",
            "read_at",
            "image_url",
            "voice_url",
            "sender_id",
            "mine",
        )

    def get_mine(self, obj):
        user = self.context.get("request").user
        return str(obj.sender_id) == str(user.id)

    def get_image_url(self, obj):
        request = self.context.get("request")
        if not obj.image or not request:
            return None
        if request.path.startswith("/api/admin/"):
            return request.build_absolute_uri(f"/api/admin/chat/messages/{obj.id}/file/")
        return request.build_absolute_uri(f"/api/chat/messages/{obj.id}/file/")

    def get_voice_url(self, obj):
        request = self.context.get("request")
        if not obj.voice or not request:
            return None
        if request.path.startswith("/api/admin/"):
            return request.build_absolute_uri(f"/api/admin/chat/messages/{obj.id}/file/")
        return request.build_absolute_uri(f"/api/chat/messages/{obj.id}/file/")


class ChatThreadSerializer(serializers.ModelSerializer):
    other = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    blocked_by_me = serializers.SerializerMethodField()
    blocked_me = serializers.SerializerMethodField()
    listing_photo = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()
    listing_id = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()
    quick_replies = serializers.SerializerMethodField()
    i_am_buyer = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = (
            "id",
            "listing_id",
            "listing_title",
            "listing_price",
            "listing_location",
            "listing_photo",
            "contact_phone",
            "created_at",
            "updated_at",
            "other",
            "last_message",
            "unread_count",
            "blocked_by_me",
            "blocked_me",
            "i_am_buyer",
            "messages",
            "quick_replies",
        )

    def get_listing_id(self, obj):
        return str(obj.listing_id) if obj.listing_id else None

    def get_i_am_buyer(self, obj):
        return str(obj.buyer_id) == str(self.context["request"].user.id)

    def get_other(self, obj):
        return public_party(obj.other_user(self.context["request"].user), self.context["request"])

    def get_listing_photo(self, obj):
        return listing_photo_url(obj.listing, self.context.get("request"))

    def get_contact_phone(self, obj):
        listing = obj.listing
        if not listing:
            return ""
        return listing.contact_phone or ""

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        preview = msg.text
        if msg.kind == ChatMessage.KIND_IMAGE:
            preview = preview or "Photo"
        elif msg.kind == ChatMessage.KIND_VOICE:
            preview = preview or "Voice message"
        elif msg.kind == ChatMessage.KIND_LOCATION:
            preview = preview or msg.location_label or "Shared location"
        return {"id": str(msg.id), "kind": msg.kind, "text": preview, "created_at": msg.created_at.isoformat(), "mine": str(msg.sender_id) == str(self.context["request"].user.id)}

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.messages.exclude(sender=user).filter(read_at__isnull=True).count()

    def get_blocked_by_me(self, obj):
        user = self.context["request"].user
        other = obj.other_user(user)
        return ChatBlock.objects.filter(blocker=user, blocked=other).exists()

    def get_blocked_me(self, obj):
        user = self.context["request"].user
        other = obj.other_user(user)
        return ChatBlock.objects.filter(blocker=other, blocked=user).exists()

    def get_quick_replies(self, obj):
        return QUICK_REPLIES

    def get_messages(self, obj):
        if not self.context.get("include_messages"):
            return None
        qs = obj.messages.select_related("sender").order_by("created_at")
        since = self.context.get("since")
        if since:
            qs = qs.filter(created_at__gt=since)
        return ChatMessageSerializer(qs, many=True, context=self.context).data


class ChatStartSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()

    def validate(self, attrs):
        listing = Listing.objects.select_related("owner").filter(pk=attrs["listing_id"], status=Listing.STATUS_APPROVED).first()
        if not listing:
            raise serializers.ValidationError("Listing not found.")
        user = self.context["request"].user
        if listing.owner_id == user.id:
            raise serializers.ValidationError("You cannot chat with yourself on your own listing.")
        if pair_blocked(user, listing.owner):
            raise serializers.ValidationError("This conversation is blocked.")
        attrs["listing"] = listing
        return attrs


class ChatMessageWriteSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=ChatMessage.KIND_CHOICES, default=ChatMessage.KIND_TEXT)
    text = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    image = serializers.CharField(required=False, allow_blank=True)
    voice = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    location_label = serializers.CharField(required=False, allow_blank=True, max_length=200)

    def validate(self, attrs):
        kind = attrs.get("kind") or ChatMessage.KIND_TEXT
        if kind == ChatMessage.KIND_TEXT and not (attrs.get("text") or "").strip():
            raise serializers.ValidationError("Write a message.")
        if kind == ChatMessage.KIND_IMAGE:
            raw = attrs.get("image")
            if not raw:
                raise serializers.ValidationError("Add a photo.")
            attrs["image_file"] = file_from_data_uri(raw, "chat")
        if kind == ChatMessage.KIND_VOICE:
            raw = attrs.get("voice")
            if not raw:
                raise serializers.ValidationError("Add a voice note.")
            attrs["voice_file"] = file_from_audio_uri(raw)
        if kind == ChatMessage.KIND_LOCATION:
            if attrs.get("lat") is None or attrs.get("lng") is None:
                raise serializers.ValidationError("Share a location pin.")
            if not (attrs.get("location_label") or "").strip():
                attrs["location_label"] = "Meeting point"
        return attrs


class ChatReportWriteSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=8, max_length=2000)
    severity = serializers.ChoiceField(choices=["normal", "high"], default="normal", required=False)
