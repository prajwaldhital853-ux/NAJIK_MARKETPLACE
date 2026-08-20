from rest_framework import serializers

from apps.notifications.models import AppNotice
from apps.verification.serializers import file_from_data_uri


class AppNoticeSerializer(serializers.ModelSerializer):
    image_uri = serializers.SerializerMethodField()
    audience_label = serializers.SerializerMethodField()

    class Meta:
        model = AppNotice
        fields = (
            "id",
            "title",
            "body",
            "audience",
            "audience_label",
            "image_uri",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_audience_label(self, obj: AppNotice) -> str:
        return dict(AppNotice.AUDIENCE_CHOICES).get(obj.audience, obj.audience)

    def get_image_uri(self, obj: AppNotice):
        if not obj.image:
            return None
        request = self.context.get("request")
        if not request:
            return None
        if request.path.startswith("/api/admin/"):
            return request.build_absolute_uri(f"/api/admin/notices/{obj.id}/image/")
        return request.build_absolute_uri(f"/api/notices/{obj.id}/image/")


class AppNoticeCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=160)
    body = serializers.CharField(required=False, allow_blank=True, default="")
    audience = serializers.ChoiceField(choices=AppNotice.AUDIENCE_CHOICES)
    image_uri = serializers.CharField(required=False, allow_blank=True)

    def validate_image_uri(self, value):
        if not (value or "").strip():
            return None
        return file_from_data_uri(value, "notice")

    def create(self, validated_data):
        image = validated_data.pop("image_uri", None)
        notice = AppNotice.objects.create(
            title=validated_data["title"].strip(),
            body=(validated_data.get("body") or "").strip(),
            audience=validated_data["audience"],
            is_active=True,
        )
        if image:
            notice.image.save(image.name, image, save=True)
        return notice
