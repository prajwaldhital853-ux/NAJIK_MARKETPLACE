from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.realtime import publish_event
from apps.reports.models import Complaint


@receiver(post_save, sender=Complaint)
def complaint_saved(sender, instance, **kwargs):
    publish_event("complaints_changed", {"id": str(instance.id)})
