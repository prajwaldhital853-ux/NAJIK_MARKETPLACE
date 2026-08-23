import logging

import requests

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

CHANNEL_BY_KIND = {
    "message": "messages",
    "booking": "bookings",
    "listing": "listings",
    "other": "default",
}


def _channel_for_kind(kind: str) -> str:
    return CHANNEL_BY_KIND.get((kind or "").strip().lower(), "default")


def _push_title(title: str, sender_name: str = "") -> str:
    text = (title or "").strip()
    if text:
        return text[:200]
    who = (sender_name or "").strip()
    return who[:200] if who else "NAJIK"


def _push_body(body: str, title: str = "") -> str:
    text = (body or "").strip()
    if text:
        return text[:500]
    return (title or "New notification")[:500]


def send_push_to_user(
    user,
    title: str,
    body: str = "",
    kind: str = "other",
    target: str = "",
    target_id: str = "",
    sender_name: str = "",
):
    """Send tray notification via Expo Push API (FCM/APNs on device)."""
    if not user:
        return

    from apps.notifications.models.push_device import PushDevice

    tokens = list(
        PushDevice.objects.filter(user=user, is_active=True).values_list("token", flat=True)
    )
    if not tokens:
        logger.info("push skipped for user %s — no registered device tokens", getattr(user, "id", ""))
        return

    payload = {
        "kind": (kind or "other")[:16],
        "target": (target or "")[:24],
        "target_id": str(target_id or "")[:64],
    }
    push_title = _push_title(title, sender_name)
    push_body = _push_body(body, push_title)
    channel_id = _channel_for_kind(kind)

    messages = [
        {
            "to": token,
            "title": push_title,
            "body": push_body,
            "data": payload,
            "sound": "default",
            "priority": "high",
            "channelId": channel_id,
        }
        for token in tokens
    ]

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json=messages,
            timeout=12,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
        )
        if response.status_code != 200:
            logger.warning("expo push HTTP %s: %s", response.status_code, response.text[:300])
            return

        payload_json = response.json()
        tickets = payload_json.get("data") if isinstance(payload_json, dict) else payload_json
        if not isinstance(tickets, list):
            return

        dead_tokens: list[str] = []
        for ticket, token in zip(tickets, tokens):
            if not isinstance(ticket, dict):
                continue
            if ticket.get("status") == "error":
                detail = ticket.get("details") or {}
                if detail.get("error") in {"DeviceNotRegistered", "InvalidCredentials"}:
                    dead_tokens.append(token)
                else:
                    logger.warning("expo push ticket error: %s", ticket.get("message"))

        if dead_tokens:
            PushDevice.objects.filter(token__in=dead_tokens).update(is_active=False)
    except Exception:
        logger.exception("expo push send failed")
