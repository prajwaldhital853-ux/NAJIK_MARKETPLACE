import uuid

from django.test import TestCase

from apps.accounts.models import AppUser
from apps.accounts.models.referral import (
    Referral,
    ReferralConsumedIdentity,
    apply_referral_code,
    generate_referral_code,
    lookup_referrer,
    qualify_referral_for_listing,
    validate_invite_code_for_registration,
)
from apps.listings.models import Listing
from apps.verification.models import ProviderApplication
from django.core.exceptions import ValidationError


def _phone():
    return f"98{uuid.uuid4().int % 10**8:08d}"


def _email(prefix="u"):
    return f"{prefix}{uuid.uuid4().hex[:10]}@example.com"


def _verified_provider(full_name="Referrer", phone=None, email=None):
    phone = phone or _phone()
    email = email or _email("ref")
    user = AppUser.objects.create_user(
        username=email,
        email=email,
        phone=phone,
        password="Str0ngPass!word",
        full_name=full_name,
        account_type=AppUser.ACCOUNT_PROVIDER,
        phone_verified=True,
        account_status=AppUser.STATUS_ACTIVE,
    )
    ProviderApplication.objects.create(
        owner=user,
        full_name=full_name,
        phone=phone,
        email=email,
        address="Kathmandu",
        contact=phone,
        service_type="plumber",
        status=ProviderApplication.STATUS_VERIFIED,
    )
    generate_referral_code(user)
    return user


def _referred_provider(phone=None, email=None):
    phone = phone or _phone()
    email = email or _email("new")
    user = AppUser.objects.create_user(
        username=email,
        email=email,
        phone=phone,
        password="Str0ngPass!word",
        full_name="Referred User",
        account_type=AppUser.ACCOUNT_PROVIDER,
        phone_verified=True,
        account_status=AppUser.STATUS_ACTIVE,
    )
    ProviderApplication.objects.create(
        owner=user,
        full_name="Referred User",
        phone=phone,
        email=email,
        address="Kathmandu",
        contact=phone,
        service_type="electrician",
        status=ProviderApplication.STATUS_VERIFIED,
    )
    return user


class ReferralLogicTests(TestCase):
    def test_referrer_earns_not_referred(self):
        referrer = _verified_provider()
        referred = _referred_provider()
        apply_referral_code(referred, referrer.referral_code)
        listing = Listing.objects.create(
            owner=referred,
            title="First item",
            description="",
            price="1000",
            location="Kathmandu",
            contact_phone=referred.phone,
            status=Listing.STATUS_APPROVED,
        )
        qualify_referral_for_listing(listing)
        ref = Referral.objects.get(referred=referred)
        self.assertEqual(ref.referrer_id, referrer.pk)
        self.assertEqual(ref.status, Referral.STATUS_EARNED)
        self.assertEqual(ref.reward_amount, 200)
        self.assertFalse(Referral.objects.filter(referrer=referred, status=Referral.STATUS_EARNED).exists())

    def test_self_referral_blocked(self):
        referrer = _verified_provider()
        with self.assertRaises(ValidationError):
            validate_invite_code_for_registration(referrer.referral_code, referrer.phone, referrer.email)

    def test_same_phone_as_referrer_blocked(self):
        referrer = _verified_provider()
        with self.assertRaises(ValidationError):
            validate_invite_code_for_registration(referrer.referral_code, referrer.phone, _email("other"))

    def test_unverified_referrer_code_invalid(self):
        phone = _phone()
        email = _email("unv")
        user = AppUser.objects.create_user(
            username=email,
            email=email,
            phone=phone,
            password="Str0ngPass!word",
            full_name="Pending",
            account_type=AppUser.ACCOUNT_PROVIDER,
            phone_verified=True,
        )
        generate_referral_code(user)
        self.assertIsNone(lookup_referrer(user.referral_code))

    def test_phone_cannot_reuse_invite_after_account_delete(self):
        referrer = _verified_provider()
        phone = _phone()
        email = _email("once")
        referred = _referred_provider(phone=phone, email=email)
        apply_referral_code(referred, referrer.referral_code)
        referred.delete()
        with self.assertRaises(ValidationError):
            validate_invite_code_for_registration(referrer.referral_code, phone, email)

    def test_second_listing_does_not_double_earn(self):
        referrer = _verified_provider()
        referred = _referred_provider()
        apply_referral_code(referred, referrer.referral_code)
        first = Listing.objects.create(
            owner=referred,
            title="First",
            location="Kathmandu",
            contact_phone=referred.phone,
            status=Listing.STATUS_APPROVED,
        )
        qualify_referral_for_listing(first)
        second = Listing.objects.create(
            owner=referred,
            title="Second",
            location="Kathmandu",
            contact_phone=referred.phone,
            status=Listing.STATUS_APPROVED,
        )
        qualify_referral_for_listing(second)
        ref = Referral.objects.get(referred=referred)
        self.assertEqual(ref.status, Referral.STATUS_EARNED)
        self.assertEqual(Referral.objects.filter(referrer=referrer, status=Referral.STATUS_EARNED).count(), 1)

    def test_sold_listing_does_not_qualify(self):
        referrer = _verified_provider()
        referred = _referred_provider()
        apply_referral_code(referred, referrer.referral_code)
        sold = Listing.objects.create(
            owner=referred,
            title="Sold only",
            location="Kathmandu",
            contact_phone=referred.phone,
            status=Listing.STATUS_APPROVED,
            extras={"sold": True},
        )
        qualify_referral_for_listing(sold)
        ref = Referral.objects.get(referred=referred)
        self.assertEqual(ref.status, Referral.STATUS_JOINED)

    def test_draft_then_publish_qualifies(self):
        from apps.listings.serializers import ListingWriteSerializer

        referrer = _verified_provider()
        referred = _referred_provider()
        apply_referral_code(referred, referrer.referral_code)
        serializer = ListingWriteSerializer()
        listing = serializer.create(
            {
                "owner": referred,
                "title": "Draft first",
                "description": "",
                "price": "500",
                "location": "Kathmandu",
                "contact_phone": referred.phone,
                "publish": False,
            }
        )
        self.assertEqual(Referral.objects.get(referred=referred).status, Referral.STATUS_JOINED)
        serializer.update(listing, {"publish": True})
        self.assertEqual(Referral.objects.get(referred=referred).status, Referral.STATUS_EARNED)

    def test_consumed_identity_created_on_apply(self):
        referrer = _verified_provider()
        phone = _phone()
        referred = _referred_provider(phone=phone)
        apply_referral_code(referred, referrer.referral_code)
        self.assertTrue(ReferralConsumedIdentity.objects.filter(phone=phone).exists())
