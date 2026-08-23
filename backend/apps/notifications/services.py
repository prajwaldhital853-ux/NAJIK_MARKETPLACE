from django.db.models import Q
from django.utils import timezone

from apps.notifications.models.inbox import InboxNotice
from apps.notifications.push_service import send_push_to_user


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
    notice = InboxNotice.objects.create(
        user=user,
        title=(title or "Notification")[:160],
        body=body[:2000],
        kind=kind,
        target=target[:24],
        target_id=normalize_target_id(target_id),
        sender_name=who[:120],
    )
    try:
        send_push_to_user(
            user,
            title=notice.title,
            body=notice.body,
            kind=kind,
            target=target,
            target_id=target_id,
            sender_name=who,
        )
    except Exception:
        pass
    return notice


def notify_chat_message(user, sender_name: str, thread_id: str, preview: str):
    """One inbox row per chat thread — latest message preview, like messenger apps."""
    if not user:
        return None
    who = (sender_name or "").strip() or "Someone"
    preview_text = (preview or "New message").strip()[:160]
    raw_tid = str(thread_id or "").strip()
    tid = normalize_target_id(raw_tid)
    if not tid:
        return None

    qs = InboxNotice.objects.filter(
        user=user,
        kind=InboxNotice.KIND_MESSAGE,
        target="chat",
    ).filter(Q(target_id=tid) | Q(target_id=raw_tid))

    existing = qs.order_by("-created_at").first()
    now = timezone.now()

    if existing:
        dup_ids = list(qs.exclude(pk=existing.pk).values_list("pk", flat=True))
        if dup_ids:
            InboxNotice.objects.filter(pk__in=dup_ids).delete()
        existing.title = who[:160]
        existing.body = preview_text
        existing.sender_name = who[:120]
        existing.is_read = False
        existing.target_id = raw_tid[:64]
        existing.created_at = now
        existing.save(update_fields=["title", "body", "sender_name", "is_read", "target_id", "created_at"])
        try:
            send_push_to_user(
                user,
                title=who,
                body=preview_text,
                kind=InboxNotice.KIND_MESSAGE,
                target="chat",
                target_id=raw_tid,
                sender_name=who,
            )
        except Exception:
            pass
        return existing

    notice = InboxNotice.objects.create(
        user=user,
        title=who[:160],
        body=preview_text,
        kind=InboxNotice.KIND_MESSAGE,
        target="chat",
        target_id=raw_tid[:64],
        sender_name=who[:120],
    )
    try:
        send_push_to_user(
            user,
            title=who,
            body=preview_text,
            kind=InboxNotice.KIND_MESSAGE,
            target="chat",
            target_id=raw_tid,
            sender_name=who,
        )
    except Exception:
        pass
    return notice


def notify_listing_activity(user, listing, title: str, body: str, sender_name: str = ""):
    """One inbox row per listing — latest comment/review preview."""
    if not user or not listing:
        return None
    who = (sender_name or "").strip() or "Someone"
    preview = (body or title or "New activity").strip()[:160]
    headline = (title or "Listing update").strip()[:160]
    raw_id = str(listing.id)
    tid = normalize_target_id(raw_id)
    qs = InboxNotice.objects.filter(
        user=user,
        kind=InboxNotice.KIND_LISTING,
        target="listing",
    ).filter(Q(target_id=tid) | Q(target_id=raw_id))
    existing = qs.order_by("-created_at").first()
    now = timezone.now()
    if existing:
        dup_ids = list(qs.exclude(pk=existing.pk).values_list("pk", flat=True))
        if dup_ids:
            InboxNotice.objects.filter(pk__in=dup_ids).delete()
        existing.title = headline
        existing.body = preview
        existing.sender_name = who[:120]
        existing.is_read = False
        existing.target_id = raw_id[:64]
        existing.created_at = now
        existing.save(update_fields=["title", "body", "sender_name", "is_read", "target_id", "created_at"])
        try:
            send_push_to_user(
                user,
                title=headline,
                body=preview,
                kind=InboxNotice.KIND_LISTING,
                target="listing",
                target_id=raw_id,
                sender_name=who,
            )
        except Exception:
            pass
        return existing
    notice = InboxNotice.objects.create(
        user=user,
        title=headline,
        body=preview,
        kind=InboxNotice.KIND_LISTING,
        target="listing",
        target_id=raw_id[:64],
        sender_name=who[:120],
    )
    try:
        send_push_to_user(
            user,
            title=headline,
            body=preview,
            kind=InboxNotice.KIND_LISTING,
            target="listing",
            target_id=raw_id,
            sender_name=who,
        )
    except Exception:
        pass
    return notice
