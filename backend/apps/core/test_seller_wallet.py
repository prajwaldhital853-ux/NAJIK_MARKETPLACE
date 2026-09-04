import uuid

from django.test import TestCase

from apps.accounts.models import AppUser
from apps.core.models import SellerLoadRequest, SellerPaymentConfig, SellerWalletTransaction
from apps.core.seller_wallet_service import (
    approve_load_request,
    create_load_request,
    deduct_listing_fee,
    get_or_create_wallet,
    rupees_to_paisa,
    admin_adjust_wallet,
)
from apps.listings.models import Listing
from apps.staff.models import StaffUser
from apps.verification.models import ProviderApplication
from django.core.exceptions import ValidationError


def _phone():
    return f"98{uuid.uuid4().int % 10**8:08d}"


def _provider():
    email = f"p{uuid.uuid4().hex[:10]}@example.com"
    phone = _phone()
    user = AppUser.objects.create_user(
        username=email,
        email=email,
        phone=phone,
        password="Str0ngPass!word",
        full_name="Seller",
        account_type=AppUser.ACCOUNT_PROVIDER,
        phone_verified=True,
    )
    ProviderApplication.objects.create(
        owner=user,
        full_name="Seller",
        phone=phone,
        email=email,
        address="K",
        contact=phone,
        service_type="plumber",
        status=ProviderApplication.STATUS_VERIFIED,
    )
    return user


def _staff():
    staff = StaffUser(email=f"staff{uuid.uuid4().hex[:8]}@example.com", full_name="Staff")
    staff.set_password("Str0ngPass!word")
    staff.save()
    return staff


class SellerWalletTests(TestCase):
    def setUp(self):
        cfg = SellerPaymentConfig.get_solo()
        cfg.listing_fee_rupees = 10
        cfg.listing_fee_tiers = []
        cfg.is_active = True
        cfg.save()

    def test_load_and_deduct_listing(self):
        provider = _provider()
        staff = _staff()
        load = create_load_request(provider, 500, payment_reference="TX123")
        approve_load_request(load.id, staff)
        wallet = get_or_create_wallet(provider)
        self.assertEqual(wallet.balance_paisa, rupees_to_paisa(500))
        listing = Listing.objects.create(
            owner=provider,
            title="Item",
            location="Kathmandu",
            contact_phone=provider.phone,
            status=Listing.STATUS_APPROVED,
        )
        deduct_listing_fee(provider, listing)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance_paisa, rupees_to_paisa(490))
        self.assertEqual(SellerWalletTransaction.objects.filter(kind="listing_fee").count(), 1)

    def test_double_deduct_blocked(self):
        provider = _provider()
        staff = _staff()
        admin_adjust_wallet(provider, 100, "seed", staff)
        listing = Listing.objects.create(
            owner=provider,
            title="One",
            location="K",
            contact_phone=provider.phone,
            status=Listing.STATUS_APPROVED,
        )
        deduct_listing_fee(provider, listing)
        deduct_listing_fee(provider, listing)
        self.assertEqual(SellerWalletTransaction.objects.filter(listing=listing, kind="listing_fee").count(), 1)

    def test_pending_load_blocks_second_request(self):
        provider = _provider()
        create_load_request(provider, 200)
        with self.assertRaises(ValidationError):
            create_load_request(provider, 300)

    def test_insufficient_balance_blocks_deduct(self):
        provider = _provider()
        listing = Listing.objects.create(
            owner=provider,
            title="X",
            location="K",
            contact_phone=provider.phone,
            status=Listing.STATUS_APPROVED,
        )
        with self.assertRaises(ValidationError):
            deduct_listing_fee(provider, listing)

    def test_tiered_listing_fee_uses_listing_price(self):
        cfg = SellerPaymentConfig.get_solo()
        cfg.listing_fee_rupees = 10
        cfg.listing_fee_tiers = [
            {"min_rupees": 0, "max_rupees": 1000, "fee_rupees": 20},
            {"min_rupees": 1001, "max_rupees": 20000, "fee_rupees": 100},
            {"min_rupees": 20001, "max_rupees": None, "fee_rupees": 200},
        ]
        cfg.save()
        provider = _provider()
        staff = _staff()
        admin_adjust_wallet(provider, 500, "seed", staff)
        cheap = Listing.objects.create(
            owner=provider,
            title="Cheap",
            price="1000",
            location="K",
            contact_phone=provider.phone,
            status=Listing.STATUS_APPROVED,
        )
        costly = Listing.objects.create(
            owner=provider,
            title="Costly",
            price="20000",
            location="K",
            contact_phone=provider.phone,
            status=Listing.STATUS_APPROVED,
        )
        deduct_listing_fee(provider, cheap)
        deduct_listing_fee(provider, costly)
        wallet = get_or_create_wallet(provider)
        self.assertEqual(wallet.balance_paisa, rupees_to_paisa(500 - 20 - 100))

    def test_cannot_approve_load_twice(self):
        provider = _provider()
        staff = _staff()
        load = create_load_request(provider, 100)
        approve_load_request(load.id, staff)
        load.refresh_from_db()
        self.assertEqual(load.status, SellerLoadRequest.STATUS_APPROVED)
        with self.assertRaises(ValidationError):
            approve_load_request(load.id, staff)
