# Boost System Setup Guide

## Quick Start

### 1. Database Setup ✅ (Already Done)
Migrations have been created and applied:
```bash
cd backend
python manage.py migrate
```

### 2. Initialize Boost Pricing
The `BoostPricing` singleton is auto-created with defaults. To customize:
```bash
# Access Django admin or use the admin panel UI
# Navigate to: http://your-domain/admin → Promotions → Boost pricing
```

Or via Django shell:
```python
from apps.promotions.models import BoostPricing

pricing = BoostPricing.get_solo()
pricing.boost_7d_rupees = 120  # Adjust pricing
pricing.max_active_boosts_per_seller = 5  # Adjust limits
pricing.save()
```

### 3. Schedule Background Maintenance
For optimal rotation and expiration, run this command every 30 minutes:

**Option A: Cron (Linux/Mac)**
```bash
# Add to crontab (crontab -e)
*/30 * * * * cd /path/to/backend && python manage.py boost_maintenance
```

**Option B: Windows Task Scheduler**
- Open Task Scheduler
- Create Basic Task
- Trigger: Daily, repeat every 30 minutes
- Action: Start a program
  - Program: `python`
  - Arguments: `manage.py boost_maintenance`
  - Start in: `D:\NAJIK_MARKETPLACE\backend`

**Option C: Celery (Recommended for production)**
```python
# In celeryconfig.py or settings.py
CELERYBEAT_SCHEDULE = {
    'boost-maintenance': {
        'task': 'apps.promotions.tasks.boost_maintenance',
        'schedule': timedelta(minutes=30),
    },
}

# Create apps/promotions/tasks.py:
from celery import shared_task
from apps.promotions.boost_service import expire_campaigns, rotate_campaign_slots

@shared_task
def boost_maintenance():
    expire_campaigns()
    rotate_campaign_slots()
```

**Option D: Manual (Development)**
```bash
python manage.py boost_maintenance
```

### 4. Mobile App Integration

**Add Promotions to Seller Drawer:**
```tsx
// In apps/mobile/src/navigation/DrawerNavigator.tsx (or similar)
import PromotionsScreen from '../screens/PromotionsScreen';

// Add to drawer screens:
<Drawer.Screen 
  name="Promotions" 
  component={PromotionsScreen}
  options={{
    drawerLabel: 'Boost Listings',
    drawerIcon: ({ color }) => <Icon name="rocket" size={22} color={color} />
  }}
/>
```

**Link from Listings Screen (optional):**
```tsx
// When user taps "Boost" on a listing:
navigation.navigate('Promotions');
// Or directly create boost:
// navigation.navigate('CreateBoost', { listingId });
```

### 5. Admin Panel Integration

**Add to Admin Routes:**
```tsx
// In apps/admin/app/admin/ads/page.tsx (create if needed)
import { BoostAdsAdminPanel } from '@/components/admin/boost-ads-admin-panel';

export default function AdsPage() {
  return <BoostAdsAdminPanel />;
}
```

**Add to Admin Sidebar:**
```tsx
// In admin navigation component
{
  label: "Ads Management",
  href: "/admin/ads",
  icon: <RocketIcon />
}
```

### 6. Testing the System

**1. Create a test seller with wallet balance:**
```python
# Django shell
from apps.accounts.models import AppUser
from apps.core.models import SellerWallet

seller = AppUser.objects.get(phone="9876543210")  # Your test seller
wallet, _ = SellerWallet.objects.get_or_create(provider=seller)
wallet.balance_paisa = 100000  # Rs. 1000
wallet.save()
```

**2. Create a boost campaign via API:**
```bash
# Get auth token first
curl -X POST http://localhost:8000/api/promotions/boost-campaigns/create/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": "your-listing-uuid",
    "duration_days": 7
  }'
```

**3. Verify in feed:**
```bash
# Fetch category feed
curl http://localhost:8000/api/listings/?category=marketplace
# Boosted listings should appear first
```

**4. Check admin panel:**
- Open admin panel → Ads Management
- Should see the active campaign
- Try pausing/resuming/extending

**5. Mobile app:**
- Login as seller
- Navigate to Promotions
- Should see pricing packages
- Should see active campaigns with analytics

### 7. Inquiry Tracking Integration

**For Chat Messages:**
```python
# In apps/chat/views.py (or wherever messages are created)
from apps.promotions.boost_service import record_boost_inquiry
from apps.promotions.models import BoostCampaign
from django.utils import timezone

# After creating a chat message related to a listing:
if listing_id:
    campaign = BoostCampaign.objects.filter(
        listing_id=listing_id,
        status=BoostCampaign.STATUS_ACTIVE,
        ends_at__gt=timezone.now()
    ).first()
    if campaign:
        record_boost_inquiry(campaign)
```

**For Booking Requests:**
```python
# Similar pattern in bookings creation endpoint
from apps.promotions.boost_service import record_boost_inquiry
# ... same logic as chat
```

### 8. Environment Variables (if needed)

No additional environment variables required. The system uses existing Django configuration.

### 9. Production Checklist

- [ ] Database migrations applied
- [ ] BoostPricing configured with appropriate pricing
- [ ] Background maintenance task scheduled (cron/celery/etc.)
- [ ] Mobile app drawer navigation updated
- [ ] Admin panel routing configured
- [ ] Inquiry tracking integrated with chat/bookings
- [ ] Monitoring/logging for boost_maintenance task
- [ ] Load testing with multiple concurrent boost campaigns
- [ ] Wallet balance checks for all sellers
- [ ] Email notifications (optional enhancement)

## Common Commands

```bash
# Run maintenance manually
python manage.py boost_maintenance

# Check active campaigns
python manage.py shell
>>> from apps.promotions.models import BoostCampaign
>>> BoostCampaign.objects.filter(status='active').count()

# Check pricing config
>>> from apps.promotions.models import BoostPricing
>>> pricing = BoostPricing.get_solo()
>>> pricing.boost_7d_rupees

# Expire campaigns now
>>> from apps.promotions.boost_service import expire_campaigns
>>> expire_campaigns()

# Force rotation
>>> from apps.promotions.boost_service import rotate_campaign_slots
>>> rotate_campaign_slots()

# Check wallet balance
>>> from apps.core.models import SellerWallet
>>> wallet = SellerWallet.objects.get(provider__phone="9876543210")
>>> print(f"Balance: Rs. {wallet.balance_paisa / 100}")
```

## Troubleshooting

### Campaign not appearing in feed
- Verify campaign status is "active"
- Check ends_at is in future
- Confirm listing is in STATUS_APPROVED
- Run `python manage.py boost_maintenance` to trigger rotation
- Check category matches between campaign and feed query

### Wallet deduction failed
- Verify seller has sufficient balance (price_paisa <= balance_paisa)
- Check SellerPaymentConfig.is_active = True
- Ensure BoostPricing.is_active = True
- Check max limits not exceeded

### Rotation not happening
- Ensure background task is scheduled and running
- Check rotation_interval_minutes in BoostPricing
- Verify last_rotation_at timestamp
- Run manual: `python manage.py boost_maintenance`

### Analytics not updating
- View tracking: Check ListingPublicDetailView integration
- Inquiry tracking: Ensure chat/bookings integration complete
- Impression tracking: Implement `record_boost_impression()` calls in feed

## Support

For issues or questions:
1. Check `BOOST_IMPLEMENTATION_SUMMARY.md` for architecture details
2. Review Django logs for errors
3. Verify database migrations applied correctly
4. Test API endpoints with curl/Postman

---

**Setup Time**: ~30 minutes
**Required Knowledge**: Django, React Native, Next.js basics
**Difficulty**: Medium
