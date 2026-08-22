from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("listings", "0007_bookings_inbox_sold"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="is_urgent",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listing",
            name="urgent_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
