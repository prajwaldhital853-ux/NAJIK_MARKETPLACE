# Generated manually for performance optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0010_comment_replies'),
    ]

    operations = [
        # Add composite index for feed queries (most common)
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS listings_listing_feed_idx ON listings_listing (status, created_at DESC) WHERE status = 'approved';",
            reverse_sql="DROP INDEX IF EXISTS listings_listing_feed_idx;",
        ),
        
        # Add index for category filtering
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS listings_listing_category_feed_idx ON listings_listing (status, category, created_at DESC) WHERE status = 'approved';",
            reverse_sql="DROP INDEX IF EXISTS listings_listing_category_feed_idx;",
        ),
        
        # Add index for seller's "My Listings"
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS listings_listing_owner_created_idx ON listings_listing (owner_id, created_at DESC);",
            reverse_sql="DROP INDEX IF EXISTS listings_listing_owner_created_idx;",
        ),
        
        # Add index for popular/trending sorts
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS listings_listing_popular_idx ON listings_listing (status, view_count DESC, created_at DESC) WHERE status = 'approved';",
            reverse_sql="DROP INDEX IF EXISTS listings_listing_popular_idx;",
        ),
        
        # Add index for promoted/boosted listings
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS listings_listing_promoted_idx ON listings_listing (status, is_promoted, created_at DESC) WHERE status = 'approved';",
            reverse_sql="DROP INDEX IF EXISTS listings_listing_promoted_idx;",
        ),
        
        # Add index for location-based searches
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS listings_listing_location_idx ON listings_listing (status, city, district, created_at DESC) WHERE status = 'approved';",
            reverse_sql="DROP INDEX IF EXISTS listings_listing_location_idx;",
        ),
    ]