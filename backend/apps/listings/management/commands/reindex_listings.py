from django.core.management.base import BaseCommand

from apps.listings.elasticsearch import bulk_index, es_enabled
from apps.listings.models import Listing


class Command(BaseCommand):
    help = "Index approved listings into Elasticsearch (requires ELASTICSEARCH_URL)."

    def add_arguments(self, parser):
        parser.add_argument("--batch", type=int, default=500, help="Bulk batch size")

    def handle(self, *args, **options):
        if not es_enabled():
            self.stderr.write("ELASTICSEARCH_URL is not set. Skipping.")
            return
        batch = max(100, options["batch"])
        qs = Listing.objects.select_related("owner").filter(status=Listing.STATUS_APPROVED).order_by("created_at")
        total = qs.count()
        done = 0
        self.stdout.write(f"Reindexing {total} approved listings...")
        while done < total:
            chunk = list(qs[done : done + batch])
            if not chunk:
                break
            bulk_index(chunk)
            done += len(chunk)
            self.stdout.write(f"  {done}/{total}")
        self.stdout.write(self.style.SUCCESS("Elasticsearch reindex complete."))
