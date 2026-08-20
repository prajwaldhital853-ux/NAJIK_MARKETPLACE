from django.db import models


def signatory_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    return f"branding/authorized-signatory.{ext}"


class BrandingConfig(models.Model):
    """Singleton branding assets (ID card signatory, etc.)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    authorized_signatory = models.ImageField(upload_to=signatory_path, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "branding config"
        verbose_name_plural = "branding config"

    def __str__(self):
        return "Branding"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
