from apps.notifications.models.inbox import InboxNotice


def normalize_target_id(value: str) -> str:
    return str(value or "").strip().lower().replace("-", "")[:64]


def notify_user(
    user,
    title: str,
    body: str = "",
    kind: str = InboxNotice.KIND_OTHER,
    target: str = "",
    target_id: str = "",
    sender_name: str = "",
):
    if not user:
        return None
    who = (sender_name or "").strip()
    if not who:
        who = "Someone"
    return InboxNotice.objects.create(
        user=user,
        title=(title or "Notification")[:160],
        body=body[:2000],
        kind=kind,
        target=target[:24],
        target_id=normalize_target_id(target_id),
        sender_name=who[:120],
    )
