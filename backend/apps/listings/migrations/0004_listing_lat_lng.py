from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("listings", "0003_listing_price_optional"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="lat",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="listing",
            name="lng",
            field=models.FloatField(blank=True, null=True),
        ),
    ]
