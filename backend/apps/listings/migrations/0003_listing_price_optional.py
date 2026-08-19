from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("listings", "0002_listing_engagement_and_edits"),
    ]

    operations = [
        migrations.AlterField(
            model_name="listing",
            name="price",
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
