"""Django management command for boost campaign maintenance."""

from django.core.management.base import BaseCommand

from apps.promotions.boost_service import expire_campaigns, rotate_campaign_slots


class Command(BaseCommand):
    help = "Expire finished campaigns and rotate boost slots for fairness"

    def handle(self, *args, **options):
        self.stdout.write("Running boost maintenance...")
        
        expire_campaigns()
        self.stdout.write(self.style.SUCCESS("Expired finished campaigns"))
        
        rotate_campaign_slots()
        self.stdout.write(self.style.SUCCESS("Rotated campaign slots"))
        
        self.stdout.write(self.style.SUCCESS("Boost maintenance complete!"))
