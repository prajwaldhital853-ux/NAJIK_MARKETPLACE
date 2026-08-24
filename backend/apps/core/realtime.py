"""Lightweight pub/sub for admin/mobile refresh hints. Uses Redis when REDIS_URL is set."""

from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

CHANNEL = "najik:events"
_redis = None


def _redis_client():
    global _redis
    url = getattr(settings, "REDIS_URL", "") or ""
    if not url:
        return None
    if _redis is None:
        try:
            import redis

            _redis = redis.from_url(url, decode_responses=True)
            _redis.ping()
        except Exception as exc:
            logger.warning("Redis unavailable for realtime events: %s", exc)
            _redis = False
    return _redis if _redis is not False else None


def publish_event(event_type: str, payload: dict[str, Any] | None = None) -> None:
    """Broadcast a small event (listings_changed, applications_changed, …)."""
    client = _redis_client()
    if not client:
        return
    body = json.dumps({"type": event_type, "payload": payload or {}})
    try:
        client.publish(CHANNEL, body)
    except Exception as exc:
        logger.warning("publish_event failed: %s", exc)


def subscribe_events():
    """Yield decoded event dicts from Redis pub/sub (blocking iterator)."""
    client = _redis_client()
    if not client:
        return
    pubsub = client.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe(CHANNEL)
    try:
        for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                data = json.loads(message["data"])
            except (TypeError, json.JSONDecodeError):
                continue
            if isinstance(data, dict) and data.get("type"):
                yield data
    finally:
        pubsub.close()
