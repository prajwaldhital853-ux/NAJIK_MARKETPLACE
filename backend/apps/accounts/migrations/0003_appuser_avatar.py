from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_loginlockout_appuser_account_type_appuser_google_sub_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="avatar",
            field=models.FileField(blank=True, upload_to="avatars/"),
        ),
    ]
