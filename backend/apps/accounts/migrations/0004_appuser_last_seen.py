from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_appuser_avatar"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="last_seen",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
