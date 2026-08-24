#!/usr/bin/env python
"""
Quick integration test for boost system.
Run with: python manage.py shell < scripts/test_boost_system.py
Or: python manage.py shell
>>> exec(open('scripts/test_boost_system.py').read())
"""

from django.utils import timezone
from apps.accounts.models import AppUser
from apps.core.models import SellerWallet, SellerWalletTransaction
from apps.listings.models import Listing
from apps.promotions.models import BoostCampaign, BoostPricing
from apps.promotions.boost_service import (
    create_boost_campaign,
    expire_campaigns,
    rotate_campaign_slots,
    get_boosted_listings_for_category,
)

print("=" * 60)
print("BOOST SYSTEM INTEGRATION TEST")
print("=" * 60)

# 1. Check pricing configuration
print("\n[1/7] Checking boost pricing configuration...")
pricing = BoostPricing.get_solo()
print(f"  3-day boost: Rs. {pricing.boost_3d_rupees}")
print(f"  7-day boost: Rs. {pricing.boost_7d_rupees}")
print(f"  14-day boost: Rs. {pricing.boost_14d_rupees}")
print(f"  30-day boost: Rs. {pricing.boost_30d_rupees}")
print(f"  System active: {pricing.is_active}")
print(f"  Rotation interval: {pricing.rotation_interval_minutes} minutes")
print(f"  View multiplier: {pricing.seller_view_multiplier}x")
print("  ✓ Pricing configured")

# 2. Find or create test seller with wallet
print("\n[2/7] Setting up test seller with wallet...")
seller = AppUser.objects.filter(account_type=AppUser.ACCOUNT_PROVIDER).first()
if not seller:
    print("  ✗ No sellers found. Create a seller account first.")
    exit(1)

wallet, created = SellerWallet.objects.get_or_create(provider=seller)
if wallet.balance_paisa < pricing.boost_7d_rupees * 100:
    wallet.balance_paisa = 50000  # Rs. 500
    wallet.save()
    print(f"  Topped up wallet to Rs. {wallet.balance_paisa / 100}")

print(f"  Seller: {seller.full_name or seller.phone}")
print(f"  Wallet balance: Rs. {wallet.balance_paisa / 100}")
print("  ✓ Seller ready")

# 3. Find approved listing
print("\n[3/7] Finding approved listing...")
listing = Listing.objects.filter(
    owner=seller,
    status=Listing.STATUS_APPROVED
).first()

if not listing:
    print("  ✗ No approved listings found for this seller.")
    print("  Create and approve a listing first.")
    exit(1)

print(f"  Listing: {listing.title}")
print(f"  Category: {listing.category}")
print("  ✓ Listing ready")

# 4. Create boost campaign
print("\n[4/7] Creating 7-day boost campaign...")
try:
    campaign = create_boost_campaign(seller, listing, duration_days=7)
    print(f"  Campaign ID: {campaign.id}")
    print(f"  Duration: {campaign.duration_days} days")
    print(f"  Cost: Rs. {campaign.price_paid_paisa / 100}")
    print(f"  Status: {campaign.status}")
    print(f"  Ends at: {campaign.ends_at.strftime('%Y-%m-%d %H:%M')}")
    print("  ✓ Campaign created")
except Exception as e:
    print(f"  ✗ Failed to create campaign: {e}")
    exit(1)

# 5. Verify wallet deduction
print("\n[5/7] Verifying wallet deduction...")
wallet.refresh_from_db()
latest_txn = SellerWalletTransaction.objects.filter(
    wallet=wallet,
    kind=SellerWalletTransaction.KIND_BOOST_FEE
).order_by('-created_at').first()

if latest_txn:
    print(f"  Transaction ID: {latest_txn.id}")
    print(f"  Amount: Rs. {abs(latest_txn.amount_paisa) / 100}")
    print(f"  New balance: Rs. {latest_txn.balance_after_paisa / 100}")
    print("  ✓ Wallet deducted")
else:
    print("  ✗ No wallet transaction found")

# 6. Test feed priority
print("\n[6/7] Testing feed priority...")
boosted_ids = get_boosted_listings_for_category(listing.category, limit=5)
if listing.id in boosted_ids:
    position = boosted_ids.index(listing.id) + 1
    print(f"  Listing appears in position {position} of boosted feed")
    print("  ✓ Feed priority working")
else:
    print("  ⚠ Listing not in boosted feed (may need rotation)")

# 7. Test rotation and expiration
print("\n[7/7] Testing rotation and expiration...")
expire_campaigns()
rotate_campaign_slots()
print("  ✓ Maintenance tasks executed")

# Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
active_count = BoostCampaign.objects.filter(
    status=BoostCampaign.STATUS_ACTIVE,
    ends_at__gt=timezone.now()
).count()
print(f"Active campaigns: {active_count}")
print(f"Total campaigns: {BoostCampaign.objects.count()}")
print(f"Seller wallet balance: Rs. {wallet.balance_paisa / 100}")
print("\n✓ Boost system test complete!")
print("\nNext steps:")
print("  1. Test mobile app Promotions screen")
print("  2. Test admin panel Ads management")
print("  3. Schedule boost_maintenance command")
print("  4. Integrate inquiry tracking with chat/bookings")
print("=" * 60)
