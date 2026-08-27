"""Apply configured data-retention policies (run daily via cron)."""
from django.core.management.base import BaseCommand

from apps.accounts.gdpr import apply_retention_policies


class Command(BaseCommand):
    help = "Purge aged OTP rows, lockouts, chat messages, and optionally inactive deactivated accounts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--purge-inactive",
            action="store_true",
            help="Also delete deactivated accounts older than inactive_account_retention_days.",
        )

    def handle(self, *args, **options):
        stats = apply_retention_policies(purge_inactive=options["purge_inactive"])
        self.stdout.write(self.style.SUCCESS(f"Retention job complete: {stats}"))
