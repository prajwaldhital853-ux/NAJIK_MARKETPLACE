import uuid

from django.db import migrations, models

import apps.core.models


def migrate_singleton_banner(apps, schema_editor):
    HomeBanner = apps.get_model("core", "HomeBanner")
    HomeBannerSlide = apps.get_model("core", "HomeBannerSlide")
    legacy = HomeBanner.objects.filter(pk=1).first()
    if not legacy or not legacy.image:
        return
    slide = HomeBannerSlide.objects.create(
        id=uuid.uuid4(),
        audience="buyer",
        sort_order=0,
        is_active=True,
    )
    slide.image.save(legacy.image.name.split("/")[-1], legacy.image, save=True)


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_home_banner"),
    ]

    operations = [
        migrations.CreateModel(
            name="HomeBannerSlide",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("image", models.ImageField(upload_to=apps.core.models.home_banner_slide_path)),
                (
                    "audience",
                    models.CharField(
                        choices=[
                            ("all", "Buyers and sellers"),
                            ("buyer", "Buyers only"),
                            ("provider", "Sellers only"),
                        ],
                        default="all",
                        max_length=20,
                    ),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["sort_order", "-created_at"],
            },
        ),
        migrations.RunPython(migrate_singleton_banner, migrations.RunPython.noop),
        migrations.DeleteModel(
            name="HomeBanner",
        ),
    ]
