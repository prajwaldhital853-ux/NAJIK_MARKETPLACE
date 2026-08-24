"""Server-Sent Events for admin dashboards — push refresh hints instead of full 15s polls."""

import json
import time

from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework.views import APIView

from apps.core.realtime import CHANNEL, _redis_client
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


def _sse_pack(event_type: str, payload: dict | None = None) -> str:
    data = json.dumps({"type": event_type, "payload": payload or {}})
    return f"event: message\ndata: {data}\n\n"


class AdminEventStreamView(APIView):
    """
    SSE stream for staff browsers. When REDIS_URL is configured, events are pushed
    instantly on listing/KYC/report changes. Without Redis, sends heartbeat only
    (client should fall back to slower REST polling).
    """

    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        heartbeat_s = max(10, int(getattr(settings, "ADMIN_SSE_HEARTBEAT_S", 25)))

        def stream():
            yield _sse_pack("connected", {"heartbeat_s": heartbeat_s})
            client = _redis_client()
            if not client:
                while True:
                    time.sleep(heartbeat_s)
                    yield _sse_pack("heartbeat", {"redis": False})
                return

            pubsub = client.pubsub(ignore_subscribe_messages=True)
            pubsub.subscribe(CHANNEL)
            last_beat = time.time()
            try:
                while True:
                    msg = pubsub.get_message(timeout=1.0)
                    if msg and msg.get("type") == "message":
                        try:
                            data = json.loads(msg["data"])
                        except (TypeError, json.JSONDecodeError):
                            data = None
                        if isinstance(data, dict) and data.get("type"):
                            yield _sse_pack(data["type"], data.get("payload") or {})
                            last_beat = time.time()
                    if time.time() - last_beat >= heartbeat_s:
                        yield _sse_pack("heartbeat", {"redis": True})
                        last_beat = time.time()
            finally:
                pubsub.close()

        response = StreamingHttpResponse(stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
