from django.db import migrations, models

import apps.core.models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_branding_emergency_contact"),
    ]

    operations = [
        migrations.CreateModel(
            name="HomeBanner",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ("image", models.ImageField(blank=True, upload_to=apps.core.models.home_banner_path)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "home banner",
                "verbose_name_plural": "home banner",
            },
        ),
    ]
