from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_complaints_and_warnings"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="allow_buyer_calls",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="appuser",
            name="hide_phone_on_ads",
            field=models.BooleanField(default=False),
        ),
    ]
