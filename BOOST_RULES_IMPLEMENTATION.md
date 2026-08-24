# Boost System Rules & Implementation Summary

## Implemented Rules

### 1. Boost Eligibility & Picker
- **Only approved, active listings** without sold status, inactive status, blocked status, or existing boost appear in the boost picker
- `listing_can_be_boosted()` checks: approved status, not sold, no active/paused boost
- Mobile displays empty message when no eligible listings
- Backend rejects boost creation for ineligible listings

### 2. BOOSTED Tags (Seller UI)
- **BOOSTED** tag (orange `#EA580C`) shown on My Listings and Seller Home when boost is **actively live**
- **BOOST PAUSED** tag (gray `#9CA3AF`) shown when campaign is paused
- Tags have priority over FEATURED/VERIFIED badges
- Tags visible only to listing owner

### 3. Pause / Resume (Days Freeze)
- Seller can pause/resume boost from Promotions → campaign card
- **While paused, days do NOT count**: `ends_at` frozen
- **On resume**: `ends_at` extended by `(now - paused_at)` duration
- Resume blocked if listing is deactivated, rejected, or sold

### 4. Delete Protection
- **Cannot delete** while boost is **actively live** (`is_boosted`)
- **Can delete** after pausing boost
- **Delete warning** shown for paused campaigns with remaining days: "Deleting will forfeit X paid boost days. No refund."
- User must confirm twice to delete listing with paused boost

### 5. No Double Boost
- A listing with an **active or paused** campaign cannot be boosted again
- `listing_has_live_boost()` checks for STATUS_ACTIVE or STATUS_PAUSED
- Duplicate listings excluded from boost picker

### 6. Instant Promotion (No Admin Approval)
- Wallet payment → campaign is **ACTIVE immediately**
- `is_promoted=True` set on listing
- Boost appears in feed priority within next rotation cycle (30 min max)

### 7. Auto-Pause Triggers
- **Listing marked sold** → `pause_boosts_for_listing()` called
- **Admin rejects listing** → boost paused with reason "Listing rejected by admin"
- **Admin deactivates listing** → boost paused with reason "Listing deactivated by admin"
- Auto-sync `is_promoted` flag on pause

### 8. Category Change Guard
- **Block category edit** while boost is active or paused
- Validation error: "Cannot change category while boost is active. Pause the boost first."

### 9. Global Boost Priority (Recommendation Feed)
- **All feeds** (not just category) show boosted listings first with rotation
- `get_all_boosted_listings()` returns cross-category boosted IDs
- Rotation slots ensure fair visibility across all boosts
- Boosted listings prioritized in:
  - **Recommendation feed** (homepage, no category filter)
  - **Trending** (sort=popular)
  - **Recent** (sort=new)
  - **By verified sellers** (verified=1)

---

## Edge Cases & Anti-Abuse

| Risk | Protection |
|------|------------|
| Sold → unpause → boost again | `listing_can_be_boosted()` blocks sold listings |
| Pause → delete → repost | Paid time is forfeited on delete; no refund |
| Rapid pause/resume to game slots | Consider min pause duration (not yet implemented) |
| Boost then change category | Category edits blocked while boost is live |
| Multiple accounts, same inventory | Platform per-seller limits enforced |
| Self-inquiries to inflate stats | Owner messages excluded from inquiry count |
| Admin deactivate then seller resumes | Resume blocked unless listing is approved |
| Concurrent wallet spend | `select_for_update` on wallet prevents race conditions |
| Infinite pause abuse | Consider max total calendar time cap (not implemented) |
| Boost expired listing | `expire_campaigns()` maintenance runs every cron cycle |

---

## Seller Workflow

### Boost a Listing
1. Open **Promotions** drawer
2. View pricing packs (3/7/14/30 days)
3. **Select listing** → only eligible listings appear (approved, not sold, not boosted)
4. Choose duration → wallet balance deducted → **boost is live immediately**
5. Listing appears with **BOOSTED** tag on My Listings and Home

### Pause / Resume
1. Open **Promotions** → My Campaigns
2. Tap campaign card → **Pause boost** button (if active)
3. Days remaining **frozen**; listing shows **BOOST PAUSED** tag
4. Resume any time → remaining days continue from where paused

### Delete Listing with Boost
1. Try delete → **blocked** if boost is live with message "Pause the boost first"
2. After pausing → delete shows warning "Forfeit X paid days. No refund."
3. Confirm twice → listing deleted, campaign cancelled

---

## Admin Controls

### Admin Panel (`/admin/ads`)
- **Live Campaigns**: Active boosts across all categories
- **All Campaigns**: Includes paused, expired, cancelled
- **Pause / Resume / Cancel / Extend** any campaign
- **Pricing Config**: Set pack prices, limits, rotation interval, view multiplier

### Auto-Pause on Admin Actions
- **Deactivate listing** → all active boosts paused
- **Reject listing** → all active boosts paused
- Seller notified via wallet transaction note

---

## Feed Priority Logic

### Category Feed (single category selected)
- `get_boosted_listings_for_category()` returns boosted IDs in rotation order
- Boosted listings appear **first** in feed
- Organic listings follow

### Global Feed (no category / multiple categories)
- `get_all_boosted_listings()` returns **all active boosts** with cross-category rotation
- Fair rotation: each campaign gets time in every slot position
- Example: If 2-3 boosts exist, they appear in slots 1-3 → organic listings follow

### Rotation Cycle
- Every **30 minutes** (configurable in `BoostPricing`)
- `python manage.py boost_maintenance` → expires old campaigns, rotates slots
- Schedule with cron or Celery Beat

---

## Demo Data

### 100 Demo Seller Accounts
Run `python manage.py seed_demo_sellers` to create:
- **100 verified sellers** with realistic names and locations
- **200 listings** across categories (property, vehicles, jobs, services, marketplace, business, nearby)
- **Wallet balance** (Rs. 5,000 - 20,000) for each seller
- **Login**: Phone `+9779841234501`, Password `demo123`

All sellers and listings appear in:
- **Buyer feed** (`/api/listings/feed/`)
- **Admin panel** (`/api/admin/listings/`)
- Can be boosted immediately for testing

---

## Testing Checklist

- [ ] Boost approved listing → appears with BOOSTED tag → higher in feed
- [ ] Boost picker → sold/deactivated/already-boosted listings NOT shown
- [ ] Pause boost → days frozen → listing shows BOOST PAUSED tag
- [ ] Resume boost → days continue from where paused
- [ ] Try delete while live → blocked with clear message
- [ ] Pause → try delete → shows forfeit warning
- [ ] Mark sold → boost auto-paused
- [ ] Admin deactivate → boost auto-paused
- [ ] Try resume on deactivated listing → blocked
- [ ] Try change category while boosted → blocked
- [ ] Check recommendation feed → boosted listings appear first across categories
- [ ] Check category feed → only that category's boosts prioritized

---

## API Endpoints

### Seller Endpoints
- `GET /api/promotions/boost-pricing/` - View pricing packs & limits
- `GET /api/promotions/boost-campaigns/me/` - My campaigns with stats
- `POST /api/promotions/boost-campaigns/` - Create boost (wallet deduct)
- `POST /api/promotions/boost-campaigns/{id}/` - Pause/resume (`{action: "pause"}`)

### Admin Endpoints
- `GET /api/admin/ads/boost-pricing/` - Get pricing config
- `PATCH /api/admin/ads/boost-pricing/` - Update pricing config
- `GET /api/admin/ads/boost-campaigns/` - All campaigns (live/all)
- `POST /api/admin/ads/boost-campaigns/{id}/` - Pause/resume/cancel/extend

---

## Database Migrations

```bash
cd backend
python manage.py migrate promotions
python manage.py migrate core  # wallet FK to boost_campaign
```

---

## Maintenance

Run every 30 minutes (cron or Celery Beat):
```bash
python manage.py boost_maintenance
```

This command:
- Expires campaigns past `ends_at`
- Rotates slot positions for fair visibility
- Syncs `is_promoted` flags on listings

---

## Files Modified/Created

### Backend
- `backend/apps/promotions/models/boost.py` - BoostCampaign, BoostPricing models
- `backend/apps/promotions/boost_service.py` - Core logic (create, pause, resume, rotate, expire, priority)
- `backend/apps/promotions/views/boost.py` - Seller & staff APIs
- `backend/apps/promotions/urls.py` - Seller routes
- `backend/apps/promotions/staff_urls.py` - Admin routes
- `backend/apps/listings/views/__init__.py` - Feed boost priority, delete guard, auto-pause
- `backend/apps/listings/serializers/__init__.py` - Boost fields, category guard
- `backend/apps/accounts/management/commands/seed_demo_sellers.py` - Demo data seed

### Mobile
- `apps/mobile/src/promotionsApi.ts` - Fetch pricing, campaigns, create, pause/resume
- `apps/mobile/src/screens/PromotionsBody.tsx` - Full promotions UI (picker, packs, campaigns, stats, pause/resume)
- `apps/mobile/src/screens/ListingsScreen.tsx` - BOOSTED/BOOST PAUSED tags, delete guard
- `apps/mobile/src/screens/HomeScreen.tsx` - BOOSTED/BOOST PAUSED tags, delete guard
- `apps/mobile/src/listingsApi.ts` - Boost fields in ApiListing, delete confirm

### Admin
- `apps/admin/components/admin/boost-ads-admin-panel.tsx` - Pricing & campaign management UI
- `apps/admin/app/admin/ads/page.tsx` - Ads page with BoostAdsAdminPanel
- `apps/admin/lib/staff-api.ts` - Staff API helpers for boost

---

## Configuration

Edit `BoostPricing` in admin or via Django admin shell:

```python
from apps.promotions.models import BoostPricing

pricing = BoostPricing.get_solo()
pricing.price_3_days = 500  # Rs. 5
pricing.price_7_days = 1000  # Rs. 10
pricing.price_14_days = 1800  # Rs. 18
pricing.price_30_days = 3500  # Rs. 35
pricing.max_active_boosts_per_seller = 5
pricing.max_active_boosts_per_category = 10
pricing.max_active_boosts_platform = 50
pricing.max_slots_per_category_feed = 5
pricing.rotation_interval_minutes = 30
pricing.seller_view_multiplier = 5  # Show 5x views to seller for confidence
pricing.is_active = True
pricing.save()
```

---

## Next Steps (Optional Enhancements)

1. **Refund policy** on admin cancel (full/partial/none)
2. **Max total pause time** cap to prevent infinite pause abuse
3. **Min pause duration** to prevent rapid pause/resume gaming
4. **Boost history** export for seller analytics
5. **Email/SMS notifications** on boost expiry, auto-pause
6. **A/B test rotation intervals** (15/30/60 min) for optimal fairness
7. **Category weighting** - premium categories get more slots
8. **Boost preview** - show expected impressions/views before purchase
9. **Auto-extend** offer if campaign performs well (upsell)
10. **Boost comparison dashboard** - show seller how boost improved metrics

---

## Support

For issues or questions:
- Check `BOOST_SETUP_GUIDE.md` for setup instructions
- Check `BOOST_IMPLEMENTATION_SUMMARY.md` for technical details
- Run `python manage.py boost_maintenance` manually to test maintenance
- Check Django logs for boost service debug messages
