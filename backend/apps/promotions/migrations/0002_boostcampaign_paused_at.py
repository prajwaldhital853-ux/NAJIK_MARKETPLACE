# Generated manually for boost pause timing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("promotions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="boostcampaign",
            name="paused_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
