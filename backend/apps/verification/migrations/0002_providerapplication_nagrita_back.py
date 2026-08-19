import apps.verification.models.application
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("verification", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="providerapplication",
            name="nagrita_back",
            field=models.FileField(
                blank=True,
                upload_to=apps.verification.models.application.nagrita_back_path,
            ),
        ),
    ]
