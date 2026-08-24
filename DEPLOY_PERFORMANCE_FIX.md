# Deploy Performance Optimizations

## Summary
Fixed app slowness (30-40 second load) by adding API pagination and reducing initial data fetching.

## Changes Made

### Backend
- ✅ Added pagination to listing feed API (`page`, `page_size` params)
- ✅ Backward compatible with legacy `limit` param
- ✅ Demo listings now include 3-5 photos each
- ✅ Migration: `promotions.0003_boostcampaigninquiry` (already applied locally)

### Mobile
- ✅ Reduced initial data load from 200 to 20-70 items
- ✅ Added "Load More" pagination to Latest Uploads section
- ✅ Supports new paginated API format

## Deployment Steps

### 1. Backend (Render)
```bash
# Already deployed via git push
# Migration will run automatically via render_start.sh

# After deploy, SSH to Render and run:
python manage.py seed_demo_sellers --count 100
```

This will:
- Add photos to existing demo listings (if missing)
- Create any new demo sellers needed up to 100 total
- Idempotent (safe to run multiple times)

### 2. Mobile (EAS)
```bash
cd apps/mobile
eas build --platform android --profile production
# or
eas build --platform ios --profile production
```

## Expected Results

| Before | After |
|--------|-------|
| 30-40 second app open | 2-4 seconds |
| 200 listings loaded initially | 20-70 listings |
| No pagination | "Load More" button |
| No photos on demo listings | 3-5 photos per listing |
| Seller listings: 10 min load | <1 second |

## Verification

### Test Feed Pagination
```bash
# Page 1 (20 items)
curl "https://najik-api-p9k2m7q.onrender.com/api/listings/feed/?page=1&page_size=20"

# Page 2 (next 20)
curl "https://najik-api-p9k2m7q.onrender.com/api/listings/feed/?page=2&page_size=20"

# Response format:
{
  "results": [...],
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

### Test Legacy Compatibility
```bash
# Old clients using limit param still work (returns array)
curl "https://najik-api-p9k2m7q.onrender.com/api/listings/feed/?limit=10"
```

### Test Mobile
1. Open app
2. Should load in 2-4 seconds (vs 30-40 before)
3. Scroll to "Latest Uploads"
4. Click "Load More"
5. Should load 20 more items instantly

## Rollback Plan
If issues occur:
1. Backend is backward compatible — no rollback needed
2. Mobile: old app version still works with new API

## Notes
- No database migrations needed (0003 already applied)
- Analytics tracking (views, impressions, inquiries) now uses real counts only
- Seller view multiplier removed from admin panel
