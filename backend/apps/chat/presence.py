from datetime import timedelta

from django.utils import timezone

from apps.chat.models import ChatThread

VIEWING_WINDOW = timedelta(seconds=20)


def mark_viewing_thread(user, thread_id):
    if not user:
        return
    thread_id = str(thread_id or "").strip()
    if not thread_id:
        ChatThread.objects.filter(buyer=user).update(buyer_viewing_at=None)
        ChatThread.objects.filter(seller=user).update(seller_viewing_at=None)
        return
    thread = ChatThread.objects.filter(pk=thread_id).filter(buyer=user).first() or ChatThread.objects.filter(
        pk=thread_id, seller=user
    ).first()
    if not thread:
        return
    now = timezone.now()
    if user.id == thread.buyer_id:
        ChatThread.objects.filter(buyer=user).exclude(pk=thread.pk).update(buyer_viewing_at=None)
        ChatThread.objects.filter(pk=thread.pk).update(buyer_viewing_at=now)
    else:
        ChatThread.objects.filter(seller=user).exclude(pk=thread.pk).update(seller_viewing_at=None)
        ChatThread.objects.filter(pk=thread.pk).update(seller_viewing_at=now)


def is_viewing_thread(user, thread) -> bool:
    if not user or not thread:
        return False
    stamp = thread.buyer_viewing_at if user.id == thread.buyer_id else thread.seller_viewing_at
    return bool(stamp and timezone.now() - stamp <= VIEWING_WINDOW)
