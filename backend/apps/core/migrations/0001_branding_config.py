from pathlib import Path

from django.core.files.base import ContentFile
from django.db import migrations, models


def seed_signatory(apps, schema_editor):
    BrandingConfig = apps.get_model("core", "BrandingConfig")
    config, _ = BrandingConfig.objects.get_or_create(pk=1)
    if config.authorized_signatory:
        return
    backend_root = Path(__file__).resolve().parents[3]
    repo_root = backend_root.parent
    candidates = [
        backend_root / "media" / "branding" / "authorized-signatory.png",
        repo_root / "apps" / "admin" / "public" / "id-card" / "authorized-signatory.png",
        repo_root / "apps" / "mobile" / "assets" / "id-card" / "authorized-signatory.png",
    ]
    for path in candidates:
        if path.is_file():
            with path.open("rb") as fh:
                config.authorized_signatory.save("authorized-signatory.png", ContentFile(fh.read()), save=True)
            break


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="BrandingConfig",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ("authorized_signatory", models.ImageField(blank=True, upload_to="branding/")),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "branding config",
                "verbose_name_plural": "branding config",
            },
        ),
        migrations.RunPython(seed_signatory, migrations.RunPython.noop),
    ]
