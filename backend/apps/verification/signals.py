from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.realtime import publish_event
from apps.verification.models import ProviderApplication


@receiver(post_save, sender=ProviderApplication)
def application_saved(sender, instance, **kwargs):
    publish_event("applications_changed", {"id": str(instance.id)})
