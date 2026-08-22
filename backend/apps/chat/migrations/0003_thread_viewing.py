from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0002_bookings_inbox_sold"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatthread",
            name="buyer_viewing_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="chatthread",
            name="seller_viewing_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
