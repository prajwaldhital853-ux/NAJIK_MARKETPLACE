from apps.notifications.models.inbox import InboxNotice


def notify_user(user, title: str, body: str = "", kind: str = InboxNotice.KIND_OTHER, target: str = "", target_id: str = ""):
    if not user:
        return None
    return InboxNotice.objects.create(
        user=user,
        title=title[:160],
        body=body[:2000],
        kind=kind,
        target=target[:24],
        target_id=str(target_id)[:64],
    )
