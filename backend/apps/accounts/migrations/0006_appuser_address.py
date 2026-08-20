from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_appuser_account_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="address",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
