from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0009_privacy_compliance"),
    ]

    operations = [
        migrations.AddField(
            model_name="sellerpaymentconfig",
            name="listing_fee_tiers",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
