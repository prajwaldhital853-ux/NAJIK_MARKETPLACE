# Text search indexes for listing_search_q (PostgreSQL pg_trgm)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0011_listing_performance_indexes"),
    ]

    operations = [
        migrations.RunSQL(
            "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="DROP EXTENSION IF EXISTS pg_trgm;",
        ),
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS listings_listing_title_trgm_idx
            ON listings_listing USING gin (title gin_trgm_ops);
            """,
            reverse_sql="DROP INDEX IF EXISTS listings_listing_title_trgm_idx;",
        ),
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS listings_listing_location_trgm_idx
            ON listings_listing USING gin (location gin_trgm_ops);
            """,
            reverse_sql="DROP INDEX IF EXISTS listings_listing_location_trgm_idx;",
        ),
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS listings_listing_city_trgm_idx
            ON listings_listing USING gin (city gin_trgm_ops);
            """,
            reverse_sql="DROP INDEX IF EXISTS listings_listing_city_trgm_idx;",
        ),
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS listings_listing_category_status_idx
            ON listings_listing (category, status, created_at DESC);
            """,
            reverse_sql="DROP INDEX IF EXISTS listings_listing_category_status_idx;",
        ),
    ]
