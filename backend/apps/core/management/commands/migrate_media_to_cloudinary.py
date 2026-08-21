"""Re-upload local FileField/ImageField files to Cloudinary and update DB names."""

from __future__ import annotations

from django.apps import apps
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import models


class Command(BaseCommand):
    help = "Copy existing local media files into the configured default storage (Cloudinary)."

    def handle(self, *args, **options):
        if not getattr(settings, "CLOUDINARY_URL", ""):
            raise CommandError("Set CLOUDINARY_URL before running this command.")

        moved = 0
        skipped = 0
        missing = 0
        for model in apps.get_models():
            file_fields = [
                f
                for f in model._meta.get_fields()
                if isinstance(f, (models.FileField, models.ImageField)) and not f.many_to_many
            ]
            if not file_fields:
                continue
            for obj in model.objects.all().iterator():
                update_fields = []
                for field in file_fields:
                    file_field = getattr(obj, field.name)
                    if not file_field or not file_field.name:
                        continue
                    name = file_field.name
                    # Already on Cloudinary-style path
                    if name.startswith("http") or "image/upload" in name or name.startswith("najik/"):
                        skipped += 1
                        continue
                    try:
                        if not file_field.storage.exists(name):
                            # try MEDIA_ROOT absolute
                            from pathlib import Path

                            local = Path(settings.MEDIA_ROOT) / name
                            if not local.is_file():
                                missing += 1
                                continue
                            data = local.read_bytes()
                        else:
                            with file_field.open("rb") as fh:
                                data = fh.read()
                    except Exception:
                        missing += 1
                        continue

                    # Save through default storage (Cloudinary) using same relative name stem.
                    new_name = default_storage.save(name, ContentFile(data))
                    setattr(obj, field.name, new_name)
                    update_fields.append(field.name)
                    moved += 1
                if update_fields:
                    obj.save(update_fields=update_fields)

        self.stdout.write(
            self.style.SUCCESS(f"Moved={moved} skipped={skipped} missing={missing}")
        )
