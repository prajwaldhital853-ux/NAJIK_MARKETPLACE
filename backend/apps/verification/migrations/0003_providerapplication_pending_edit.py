from django.db import migrations, models
import apps.verification.models.application


class Migration(migrations.Migration):
    dependencies = [
        ("verification", "0002_providerapplication_nagrita_back"),
    ]

    operations = [
        migrations.AddField(
            model_name="providerapplication",
            name="pending_edit",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="providerapplication",
            name="pending_nagrita",
            field=models.FileField(blank=True, upload_to=apps.verification.models.application.nagrita_path),
        ),
        migrations.AddField(
            model_name="providerapplication",
            name="pending_nagrita_back",
            field=models.FileField(blank=True, upload_to=apps.verification.models.application.nagrita_back_path),
        ),
        migrations.AddField(
            model_name="providerapplication",
            name="pending_photo",
            field=models.FileField(blank=True, upload_to=apps.verification.models.application.photo_path),
        ),
    ]
