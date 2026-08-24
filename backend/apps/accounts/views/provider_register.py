from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AppUser
from apps.accounts.otp import request_otp, verify_otp
from apps.accounts.serializers.auth import (
    AppTokenSerializer,
    AppUserPublicSerializer,
    normalize_phone,
)
from apps.accounts.throttles import OtpRateThrottle, RegisterRateThrottle
from apps.verification.models import ProviderApplication, ensure_provider_id_card
from apps.verification.serializers import file_from_data_uri
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
import re


def is_reclaimable_provider(user: AppUser) -> bool:
    if user.account_type != AppUser.ACCOUNT_PROVIDER:
        return False
    if not user.phone_verified and not user.email_verified:
        return True
    app = getattr(user, "provider_application", None)
    if app is None:
        return True
    return app.status == ProviderApplication.STATUS_REJECTED


def reclaim_provider_identities(*, phone: str | None, email: str | None) -> None:
    qs = AppUser.objects.filter(account_type=AppUser.ACCOUNT_PROVIDER)
    victims = []
    if phone:
        victims.extend(list(qs.filter(phone=phone)))
    if email:
        victims.extend(list(qs.filter(email__iexact=email)))
    seen = set()
    for user in victims:
        if user.pk in seen:
            continue
        seen.add(user.pk)
        if is_reclaimable_provider(user):
            user.delete()


class GuestOtpRequestSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=(("phone", "phone"),))
    identifier = serializers.CharField()

    def validate(self, attrs):
        phone = normalize_phone(attrs["identifier"])
        if not re.fullmatch(r"9\d{9}", phone):
            raise serializers.ValidationError({"identifier": "Enter a valid Nepal mobile number."})
        attrs["identifier"] = phone
        return attrs


class GuestOtpRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [OtpRateThrottle]

    def post(self, request):
        serializer = GuestOtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_otp(serializer.validated_data["identifier"], "phone")
        return Response({"detail": "If this contact is valid, a code was sent."})


class ProviderRegisterCompleteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=8)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=15)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=255)
    contact = serializers.CharField(max_length=80, required=False, allow_blank=True)
    service_type = serializers.CharField(max_length=40)
    nagrita_uri = serializers.CharField()
    nagrita_back_uri = serializers.CharField()
    photo_uri = serializers.CharField()
    nation_card_uri = serializers.CharField()
    other_document_uri = serializers.CharField(required=False, allow_blank=True)
    profile_data = serializers.DictField(required=False)
    referral_code = serializers.CharField(required=False, allow_blank=True, max_length=32)

    def validate_phone(self, value):
        phone = normalize_phone(value)
        if not re.fullmatch(r"9\d{9}", phone):
            raise serializers.ValidationError("Enter a valid Nepal mobile number.")
        return phone

    def validate_email(self, value):
        return value.lower().strip()

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def validate_nagrita_uri(self, value):
        return file_from_data_uri(value, "nagrita")

    def validate_nagrita_back_uri(self, value):
        return file_from_data_uri(value, "nagrita_back")

    def validate_photo_uri(self, value):
        return file_from_data_uri(value, "photo")

    def validate_nation_card_uri(self, value):
        return file_from_data_uri(value, "nation_card")

    def validate_other_document_uri(self, value):
        if not (value or "").strip():
            return None
        return file_from_data_uri(value, "other_document")

    def validate(self, attrs):
        phone = attrs["phone"]
        email = attrs["email"]
        if not verify_otp(phone, "phone", attrs["code"]):
            raise serializers.ValidationError({"code": "Invalid or expired code."})

        # Block non-reclaimable collisions (e.g. active verified provider / buyer).
        for field, value, lookup in (
            ("phone", phone, {"phone": phone}),
            ("email", email, {"email__iexact": email}),
        ):
            existing = AppUser.objects.filter(**lookup).first()
            if existing and not is_reclaimable_provider(existing):
                role = "service provider" if existing.account_type == AppUser.ACCOUNT_PROVIDER else "buyer"
                raise serializers.ValidationError(
                    {field: f"This {field} is already registered as a {role} account."}
                )
        attrs["profile_data"] = attrs.get("profile_data") or {}
        ref_raw = (attrs.get("referral_code") or "").strip()
        if ref_raw:
            from apps.accounts.models.referral import validate_invite_code_for_registration

            try:
                from apps.accounts.models import AppUser

                attrs["referral_code"] = validate_invite_code_for_registration(
                    ref_raw, attrs["phone"], attrs["email"], AppUser.ACCOUNT_PROVIDER
                )
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"referral_code": exc.messages}) from exc
        else:
            attrs["referral_code"] = ""
        return attrs


class ProviderRegisterCompleteView(APIView):
    """Create provider account + pending KYC only after OTP succeeds."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RegisterRateThrottle]

    @transaction.atomic
    def post(self, request):
        serializer = ProviderRegisterCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        reclaim_provider_identities(phone=data["phone"], email=data["email"])

        password = data.pop("password")
        data.pop("code")
        nagrita = data.pop("nagrita_uri")
        nagrita_back = data.pop("nagrita_back_uri")
        photo = data.pop("photo_uri")
        nation_card = data.pop("nation_card_uri")
        other_document = data.pop("other_document_uri", None)
        profile_data = data.pop("profile_data", {})
        contact = data.get("contact") or data["phone"]

        user = AppUser.objects.create_user(
            password=password,
            full_name=data["full_name"],
            phone=data["phone"],
            email=data["email"],
            address=data["address"],
            account_type=AppUser.ACCOUNT_PROVIDER,
            username=data["email"] or data["phone"],
            phone_verified=True,
            email_verified=False,
        )

        app = ProviderApplication(
            owner=user,
            full_name=data["full_name"],
            address=data["address"],
            contact=contact,
            phone=data["phone"],
            email=data["email"],
            service_type=data["service_type"],
            nagrita=nagrita,
            nagrita_back=nagrita_back,
            photo=photo,
            nation_card=nation_card,
            profile_data=profile_data,
            status=ProviderApplication.STATUS_PENDING,
        )
        if other_document:
            app.other_document = other_document
        app.save()
        ensure_provider_id_card(user)

        from apps.accounts.models.referral import apply_referral_code, generate_referral_code

        generate_referral_code(user)

        referral_raw = (data.get("referral_code") or "").strip()
        if referral_raw:
            apply_referral_code(user, referral_raw)

        user = AppUser.objects.select_related("provider_application").get(pk=user.pk)
        tokens = AppTokenSerializer.for_user(user)
        return Response(
            {"user": AppUserPublicSerializer(user, context={"request": request}).data, **tokens},
            status=status.HTTP_201_CREATED,
        )
