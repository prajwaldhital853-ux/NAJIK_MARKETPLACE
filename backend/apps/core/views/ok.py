from django.http import HttpResponse
from django.views import View


class OkView(View):
    """Tiny keep-alive endpoint for cron-job.org (plain 200 + ok)."""

    def get(self, request):
        return HttpResponse(b"ok", content_type="text/plain; charset=utf-8", status=200)

    def head(self, request):
        return HttpResponse(b"", content_type="text/plain; charset=utf-8", status=200)
