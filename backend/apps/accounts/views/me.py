import mimetypes
import re

from django.core.exceptions import ValidationError
from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.permissions import IsAppUser
from apps.accounts.serializers.auth import AppUserPublicSerializer, identity_taken_message, normalize_phone
from apps.verification.serializers import file_from_data_uri

PHONE_RE = re.compile(r"9\d{9}")


class MePhotoPatchSerializer(serializers.Serializer):
    photo_uri = serializers.CharField(required=False)
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=15)
    address = serializers.CharField(required=False, allow_blank=True, max_length=255)
    allow_buyer_calls = serializers.BooleanField(required=False)
    hide_phone_on_ads = serializers.BooleanField(required=False)
    referral_code = serializers.CharField(required=False, allow_blank=True, max_length=32)
    legal_accepted = serializers.BooleanField(required=False, default=False)

    def validate_photo_uri(self, value):
        return file_from_data_uri(value, "avatar")

    def validate_phone(self, value):
        if not value:
            return None
        phone = normalize_phone(value)
        if not PHONE_RE.fullmatch(phone):
            raise serializers.ValidationError("Enter a valid Nepal mobile number.")
        return phone

    def validate(self, attrs):
        keys = (
            "photo_uri",
            "full_name",
            "phone",
            "address",
            "allow_buyer_calls",
            "hide_phone_on_ads",
            "referral_code",
            "legal_accepted",
        )
        if not any(key in self.initial_data for key in keys):
            raise serializers.ValidationError("Nothing to update.")
        return attrs


class MeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    allow_inactive = True

    def get(self, request):
        user = AppUser.objects.select_related("provider_application").get(pk=request.user.pk)
        return Response(AppUserPublicSerializer(user, context={"request": request}).data)

    def patch(self, request):
        user = AppUser.objects.select_related("provider_application").get(pk=request.user.pk)
        serializer = MePhotoPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        referral_raw = (data.get("referral_code") or "").strip()
        profile_keys = {"full_name", "phone", "address"}
        if profile_keys.intersection(data.keys()) and not user.terms_accepted_at:
            from apps.accounts.legal import require_legal_acceptance

            require_legal_acceptance(data)
        if user.account_type == user.ACCOUNT_PROVIDER and "photo_uri" in data:
            return Response(
                {"detail": "Service providers update their photo from profile edit, which admin must verify."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updates = []
        if data.get("photo_uri") is not None:
            user.avatar = data["photo_uri"]
            updates.append("avatar")
        if "full_name" in data and data.get("full_name") is not None:
            user.full_name = (data.get("full_name") or "").strip()
            updates.append("full_name")
        if "address" in data and data.get("address") is not None:
            user.address = (data.get("address") or "").strip()
            updates.append("address")
        if "phone" in data:
            phone = data.get("phone")
            if phone:
                existing = AppUser.objects.filter(phone=phone).exclude(pk=user.pk).first()
                if existing:
                    return Response({"detail": identity_taken_message(existing, "phone")}, status=status.HTTP_400_BAD_REQUEST)
                if user.phone != phone:
                    user.phone_verified = False
                    updates.append("phone_verified")
                user.phone = phone
                updates.append("phone")
        if "allow_buyer_calls" in data:
            user.allow_buyer_calls = bool(data.get("allow_buyer_calls"))
            updates.append("allow_buyer_calls")
        if "hide_phone_on_ads" in data:
            user.hide_phone_on_ads = bool(data.get("hide_phone_on_ads"))
            updates.append("hide_phone_on_ads")
        if data.get("legal_accepted"):
            from apps.accounts.legal import stamp_legal_acceptance

            stamp_legal_acceptance(user, data)
        if not updates and not referral_raw and not data.get("legal_accepted"):
            return Response({"detail": "Nothing to update."}, status=status.HTTP_400_BAD_REQUEST)
        if updates:
            user.save(update_fields=updates)
        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        if referral_raw:
            if user.account_type != AppUser.ACCOUNT_USER:
                return Response({"detail": "Invite codes apply to buyer accounts only."}, status=status.HTTP_400_BAD_REQUEST)
            if not (user.phone or "").strip():
                return Response({"referral_code": ["Add your phone number before using an invite code."]}, status=status.HTTP_400_BAD_REQUEST)
            from apps.accounts.models.referral import Referral, apply_referral_code, generate_referral_code, qualify_referral_for_buyer

            if Referral.objects.filter(referred=user).exists():
                return Response({"referral_code": ["This account already used an invite code."]}, status=status.HTTP_400_BAD_REQUEST)
            try:
                apply_referral_code(user, referral_raw)
            except ValidationError as exc:
                message = exc.messages[0] if getattr(exc, "messages", None) else str(exc)
                return Response({"referral_code": [message]}, status=status.HTTP_400_BAD_REQUEST)
            generate_referral_code(user)
            user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
            qualify_referral_for_buyer(user)
        return Response(AppUserPublicSerializer(user, context={"request": request}).data)


class MePhotoView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        if not request.user.avatar:
            return Response(status=status.HTTP_404_NOT_FOUND)
        content_type, _ = mimetypes.guess_type(request.user.avatar.name)
        return FileResponse(request.user.avatar.open("rb"), content_type=content_type or "application/octet-stream")
