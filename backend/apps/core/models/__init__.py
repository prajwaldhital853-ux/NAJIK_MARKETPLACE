from django.db import models


def signatory_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    return f"branding/authorized-signatory.{ext}"


class BrandingConfig(models.Model):
    """Singleton branding assets (ID card signatory, emergency contact, etc.)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    authorized_signatory = models.ImageField(upload_to=signatory_path, blank=True)
    emergency_phone = models.CharField(max_length=40, blank=True, default="01-5970123")
    emergency_email = models.EmailField(blank=True, default="support@najik.com")
    website = models.CharField(max_length=120, blank=True, default="www.najik.com")
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
