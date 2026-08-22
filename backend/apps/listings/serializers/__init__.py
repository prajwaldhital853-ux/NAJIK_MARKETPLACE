import base64
import re
import uuid

from django.core.exceptions import ObjectDoesNotExist
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.listings.models import Listing, ListingComment, ListingPhoto, ListingReview, ListingSave

MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_PHOTOS = 8
DATA_URI = re.compile(r"^data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$", re.I)
EDIT_FIELDS = (
    "category",
    "subcategory",
    "title",
    "description",
    "price",
    "negotiable",
    "location",
    "city",
    "district",
    "lat",
    "lng",
    "contact_name",
    "contact_phone",
    "contact_email",
    "contact_whatsapp",
    "contact_via",
    "extras",
)


def file_from_data_uri(value: str, prefix: str) -> ContentFile:
    match = DATA_URI.match((value or "").strip())
    if not match:
        raise serializers.ValidationError("Upload a JPEG, PNG, or WebP image.")
    try:
        raw = base64.b64decode(re.sub(r"\s+", "", match.group(2)), validate=True)
    except Exception as exc:
        raise serializers.ValidationError("Invalid image data.") from exc
    if len(raw) > MAX_IMAGE_BYTES:
        raise serializers.ValidationError("Each photo must be 2 MB or smaller.")
    ext = match.group(1).lower().replace("jpg", "jpeg")
    return ContentFile(raw, name=f"{prefix}_{uuid.uuid4().hex[:8]}.{ext}")


def viewer_flags(serializer):
    request = serializer.context.get("request")
    listing = serializer.instance if isinstance(serializer.instance, Listing) else None
    user = getattr(request, "user", None) if request else None
    is_owner = bool(listing and user and getattr(user, "is_authenticated", False) and getattr(user, "id", None) == listing.owner_id)
    is_staff = bool(request and request.path.startswith("/api/admin/"))
    return request, user, is_owner, is_staff


class ListingPhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ListingPhoto
        fields = ("id", "url", "sort_order", "is_pending")

    def get_url(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        if request.path.startswith("/api/admin/"):
            return request.build_absolute_uri(f"/api/admin/listings/{obj.listing_id}/photos/{obj.id}/")
        return request.build_absolute_uri(f"/api/listings/{obj.listing_id}/photos/{obj.id}/")


class ListingCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_id = serializers.UUIDField(source="author.id", read_only=True)

    class Meta:
        model = ListingComment
        fields = ("id", "author_id", "author_name", "text", "created_at")
        read_only_fields = fields


class ListingReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_id = serializers.UUIDField(source="author.id", read_only=True)

    class Meta:
        model = ListingReview
        fields = ("id", "author_id", "author_name", "rating", "text", "created_at")
        read_only_fields = fields


class ListingSerializer(serializers.ModelSerializer):
    photos = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source="owner.full_name", read_only=True)
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)
    comments = ListingCommentSerializer(many=True, read_only=True)
    reviews = ListingReviewSerializer(many=True, read_only=True)
    save_count = serializers.IntegerField(source="saves.count", read_only=True)
    comment_count = serializers.IntegerField(source="comments.count", read_only=True)
    review_count = serializers.IntegerField(source="reviews.count", read_only=True)
    rating_avg = serializers.SerializerMethodField()
    seller_verified = serializers.SerializerMethodField()
    has_pending_edit = serializers.SerializerMethodField()
    pending_edit = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    is_urgent = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "status",
            "category",
            "subcategory",
            "title",
            "description",
            "price",
            "negotiable",
            "location",
            "city",
            "district",
            "lat",
            "lng",
            "contact_name",
            "contact_phone",
            "contact_email",
            "contact_whatsapp",
            "contact_via",
            "extras",
            "promote_requested",
            "is_promoted",
            "is_urgent",
            "urgent_ends_at",
            "admin_reason",
            "reviewed_at",
            "created_at",
            "updated_at",
            "photos",
            "owner_name",
            "owner_id",
            "view_count",
            "save_count",
            "comment_count",
            "review_count",
            "rating_avg",
            "seller_verified",
            "comments",
            "reviews",
            "has_pending_edit",
            "pending_edit",
            "saved_by_me",
        )
        read_only_fields = fields

    def get_rating_avg(self, obj):
        ratings = [row.rating for row in obj.reviews.all()]
        if not ratings:
            return 0
        return round(sum(ratings) / len(ratings), 1)

    def get_seller_verified(self, obj):
        try:
            return obj.owner.provider_application.status == "verified"
        except ObjectDoesNotExist:
            return False

    def get_has_pending_edit(self, obj):
        return bool(obj.pending_edit)

    def get_pending_edit(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        is_owner = bool(user and getattr(user, "is_authenticated", False) and getattr(user, "id", None) == obj.owner_id)
        is_staff = bool(request and request.path.startswith("/api/admin/"))
        if is_owner or is_staff:
            return obj.pending_edit or {}
        return {}

    def get_saved_by_me(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not getattr(user, "is_authenticated", False) or not hasattr(user, "account_type"):
            return False
        return obj.saves.filter(user_id=user.id).exists()

    def get_is_urgent(self, obj):
        if not obj.is_urgent or not obj.urgent_ends_at:
            return False
        return obj.urgent_ends_at > timezone.now()

    def get_photos(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        is_owner = bool(user and getattr(user, "is_authenticated", False) and getattr(user, "id", None) == obj.owner_id)
        is_staff = bool(request and request.path.startswith("/api/admin/"))
        photos = obj.photos.all()
        if not (is_owner or is_staff):
            photos = photos.filter(is_pending=False)
        return ListingPhotoSerializer(photos, many=True, context=self.context).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        is_owner = bool(user and getattr(user, "is_authenticated", False) and getattr(user, "id", None) == instance.owner_id)
        is_staff = bool(request and request.path.startswith("/api/admin/"))
        owner = instance.owner
        if not is_owner and not is_staff:
            if getattr(owner, "hide_phone_on_ads", False) or not getattr(owner, "allow_buyer_calls", True):
                data["contact_phone"] = ""
        return data


class ListingWriteSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=Listing.CATEGORY_CHOICES)
    subcategory = serializers.CharField(max_length=40)
    title = serializers.CharField(max_length=160)
    description = serializers.CharField(allow_blank=True)
    price = serializers.CharField(max_length=40, required=False, allow_blank=True)
    negotiable = serializers.BooleanField(required=False, default=False)
    location = serializers.CharField(max_length=160)
    city = serializers.CharField(max_length=80, required=False, allow_blank=True)
    district = serializers.CharField(max_length=80, required=False, allow_blank=True)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    contact_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    contact_phone = serializers.CharField(max_length=15)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_whatsapp = serializers.CharField(max_length=15, required=False, allow_blank=True)
    contact_via = serializers.ChoiceField(choices=Listing.CONTACT_CHOICES, required=False)
    extras = serializers.JSONField(required=False)
    photos = serializers.ListField(child=serializers.CharField(), required=False, max_length=MAX_PHOTOS)
    promote = serializers.BooleanField(required=False, default=False)
    publish = serializers.BooleanField(required=False)

    def validate_photos(self, value):
        if value is None:
            return None
        if not value:
            return []
        return [file_from_data_uri(item, "listing") for item in value]

    def validate(self, attrs):
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        photos = validated_data.pop("photos", None) or []
        promote = validated_data.pop("promote", False)
        publish = validated_data.pop("publish", True)
        owner = validated_data.pop("owner")
        validated_data.setdefault("price", "")
        listing = Listing.objects.create(
            owner=owner,
            **validated_data,
            promote_requested=promote,
            status=Listing.STATUS_APPROVED if publish else Listing.STATUS_DRAFT,
            reviewed_at=timezone.now() if publish else None,
            is_promoted=False,
        )
        for index, photo in enumerate(photos):
            ListingPhoto.objects.create(listing=listing, image=photo, sort_order=index)
        if publish and listing.status == Listing.STATUS_APPROVED:
            from apps.accounts.models.referral import qualify_referral_for_listing
            from apps.core.seller_wallet_service import deduct_listing_fee, InsufficientBalanceError

            try:
                deduct_listing_fee(owner, listing)
            except InsufficientBalanceError as exc:
                msg = exc.messages[0] if getattr(exc, "messages", None) else str(exc)
                raise serializers.ValidationError({"detail": msg}) from exc
            qualify_referral_for_listing(listing)
        return listing

    @transaction.atomic
    def update(self, instance, validated_data):
        photos = validated_data.pop("photos", None)
        promote = validated_data.pop("promote", None)
        publish = validated_data.pop("publish", False)
        validated_data.pop("owner", None)
        was_approved = instance.status == Listing.STATUS_APPROVED
        if promote is not None:
            validated_data["promote_requested"] = promote

        if instance.status == Listing.STATUS_APPROVED and publish:
            edit = dict(instance.pending_edit or {})
            for key in EDIT_FIELDS:
                if key in validated_data:
                    edit[key] = validated_data[key]
            if promote is not None:
                edit["promote_requested"] = promote
            if photos is not None:
                keep_ids = [str(photo.id) for photo in instance.photos.filter(is_pending=False)]
                edit["keep_photo_ids"] = keep_ids
                instance.photos.filter(is_pending=True).delete()
                for index, photo in enumerate(photos):
                    ListingPhoto.objects.create(listing=instance, image=photo, sort_order=index, is_pending=True)
            instance.pending_edit = edit
            instance.save(update_fields=["pending_edit", "updated_at"])
            return instance

        for key, value in validated_data.items():
            setattr(instance, key, value)
        if publish:
            instance.status = Listing.STATUS_APPROVED
            instance.admin_reason = ""
            instance.reviewed_at = timezone.now()
            instance.is_promoted = False
            instance.pending_edit = {}
        instance.save()
        if photos is not None:
            instance.photos.all().delete()
            for index, photo in enumerate(photos):
                ListingPhoto.objects.create(listing=instance, image=photo, sort_order=index)
        if instance.status == Listing.STATUS_APPROVED and not was_approved:
            from apps.accounts.models.referral import qualify_referral_for_listing
            from apps.core.seller_wallet_service import deduct_listing_fee, InsufficientBalanceError

            try:
                deduct_listing_fee(instance.owner, instance)
            except InsufficientBalanceError as exc:
                msg = exc.messages[0] if getattr(exc, "messages", None) else str(exc)
                raise serializers.ValidationError({"detail": msg}) from exc
            qualify_referral_for_listing(instance)
        return instance


def apply_pending_edit(listing: Listing):
    edit = listing.pending_edit or {}
    if not edit:
        return listing
    for field in EDIT_FIELDS:
        if field in edit:
            setattr(listing, field, edit[field])
    if "promote_requested" in edit:
        listing.promote_requested = bool(edit["promote_requested"])
    keep_ids = set(edit.get("keep_photo_ids") or [])
    if keep_ids or listing.photos.filter(is_pending=True).exists():
        listing.photos.filter(is_pending=False).exclude(id__in=keep_ids).delete()
        listing.photos.filter(is_pending=True).update(is_pending=False)
    listing.pending_edit = {}
    listing.admin_reason = ""
    listing.save()
    return listing


class ListingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(Listing.STATUS_APPROVED, Listing.STATUS_REJECTED, Listing.STATUS_DEACTIVATED)
    )
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        needs_reason = attrs["status"] in {Listing.STATUS_REJECTED, Listing.STATUS_DEACTIVATED}
        if needs_reason and not (attrs.get("reason") or "").strip():
            raise serializers.ValidationError(
                {
                    "reason": (
                        "Add a note so the seller knows why this listing was deactivated."
                        if attrs["status"] == Listing.STATUS_DEACTIVATED
                        else "Add a reason so the seller knows why this listing was rejected."
                    )
                }
            )
        return attrs


class ListingCommentWriteSerializer(serializers.Serializer):
    text = serializers.CharField(min_length=1, max_length=1000)


class ListingReviewWriteSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    text = serializers.CharField(min_length=1, max_length=1000)
