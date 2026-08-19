from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_appuser_last_seen"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="account_status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("blocked", "Blocked"),
                    ("deactivated", "Deactivated"),
                ],
                default="active",
                max_length=16,
            ),
        ),
    ]
