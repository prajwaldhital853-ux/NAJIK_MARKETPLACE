"""GDPR-style data export, deletion, and retention helpers."""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AppUser, LoginLockout, OneTimePassword, PasswordResetToken
from apps.core.models import DataSubjectRequestLog, PrivacyRetentionConfig


ANONYMOUS = "[deleted user]"


def _iso(dt):
    if dt is None:
        return None
    return dt.isoformat()


def _file_name(field) -> str | None:
    if not field:
        return None
    try:
        return field.name or None
    except Exception:
        return None


def export_user_data(user: AppUser) -> dict:
    from apps.chat.models import ChatMessage, ChatThread
    from apps.listings.models import Listing
    from apps.reports.models import Complaint
    from apps.verification.models import ProviderApplication

    listings = list(
        user.listings.all().values(
            "id",
            "title",
            "description",
            "price",
            "status",
            "category",
            "location",
            "created_at",
            "updated_at",
        )
    )
    threads = ChatThread.objects.filter(buyer=user) | ChatThread.objects.filter(seller=user)
    thread_ids = list(threads.values_list("id", flat=True))
    messages = list(
        ChatMessage.objects.filter(thread_id__in=thread_ids, sender=user).values(
            "id",
            "thread_id",
            "kind",
            "text",
            "location_label",
            "created_at",
        )
    )
    reviews_given = list(
        user.seller_reviews_given.all().values("id", "listing_id", "rating", "text", "created_at")
    )
    reviews_received = list(
        user.seller_reviews_received.all().values("id", "listing_id", "rating", "text", "created_at")
    )
    bookings_sent = list(user.bookings_sent.all().values("id", "listing_id", "status", "created_at"))
    bookings_received = list(user.bookings_received.all().values("id", "listing_id", "status", "created_at"))
    saved = list(user.saved_listings.all().values("listing_id", "created_at"))
    referrals_sent = list(
        user.referrals_sent.all().values("id", "referred_phone", "invite_code", "status", "joined_at", "earned_at")
    )
    referral_received = None
    try:
        ref = user.referral_received
        referral_received = {
            "referrer_id": str(ref.referrer_id),
            "status": ref.status,
            "joined_at": _iso(ref.joined_at),
            "earned_at": _iso(ref.earned_at),
        }
    except Exception:
        pass
    complaints = list(
        Complaint.objects.filter(reporter=user).values(
            "id",
            "status",
            "kind",
            "reason",
            "created_at",
        )
    )
    app = None
    try:
        kyc = user.provider_application
    except ProviderApplication.DoesNotExist:
        kyc = None
    if kyc:
        app = {
            "status": kyc.status,
            "full_name": kyc.full_name,
            "address": kyc.address,
            "phone": kyc.phone,
            "email": kyc.email,
            "service_type": kyc.service_type,
            "submitted_at": _iso(kyc.created_at),
            "documents": {
                "nagrita": _file_name(kyc.nagrita),
                "nagrita_back": _file_name(kyc.nagrita_back),
                "photo": _file_name(kyc.photo),
                "nation_card": _file_name(kyc.nation_card),
                "other_document": _file_name(kyc.other_document),
            },
        }
    wallet = None
    if hasattr(user, "seller_wallet"):
        w = getattr(user, "seller_wallet", None)
        if w:
            wallet = {
                "balance_paisa": w.balance_paisa,
                "updated_at": _iso(w.updated_at),
                "transactions": list(
                    w.transactions.all().values("id", "kind", "amount_paisa", "note", "created_at")
                ),
                "load_requests": list(
                    user.seller_load_requests.all().values("id", "amount_paisa", "status", "created_at")
                ),
            }
    id_card = None
    if hasattr(user, "id_card"):
        card = getattr(user, "id_card", None)
        if card:
            id_card = {
                "card_code": card.card_code,
                "created_at": _iso(card.created_at),
                "access_status": card.access_status,
            }

    return {
        "exported_at": timezone.now().isoformat(),
        "format_version": 1,
        "profile": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "full_name": user.full_name,
            "address": user.address,
            "account_type": user.account_type,
            "account_status": user.account_status,
            "phone_verified": user.phone_verified,
            "email_verified": user.email_verified,
            "allow_buyer_calls": user.allow_buyer_calls,
            "hide_phone_on_ads": user.hide_phone_on_ads,
            "referral_code": user.referral_code,
            "terms_accepted_at": _iso(user.terms_accepted_at),
            "privacy_accepted_at": _iso(user.privacy_accepted_at),
            "date_joined": _iso(user.date_joined),
            "last_seen": _iso(user.last_seen),
            "avatar": _file_name(user.avatar),
        },
        "listings": listings,
        "saved_listings": saved,
        "chat_messages": messages,
        "reviews_given": reviews_given,
        "reviews_received": reviews_received,
        "bookings_sent": bookings_sent,
        "bookings_received": bookings_received,
        "referrals_sent": referrals_sent,
        "referral_received": referral_received,
        "complaints_filed": complaints,
        "kyc_application": app,
        "seller_wallet": wallet,
        "provider_id_card": id_card,
        "push_devices": list(user.push_devices.all().values("platform", "token", "created_at")),
        "inbox_notices": list(user.inbox_notices.all().values("title", "body", "kind", "is_read", "created_at")),
    }


def _anonymize_snapshot(snapshot: dict | None) -> dict:
    if not isinstance(snapshot, dict):
        return {}
    cleaned = dict(snapshot)
    for key in ("full_name", "email", "phone", "username", "name"):
        if key in cleaned:
            cleaned[key] = ANONYMOUS
    return cleaned


def anonymize_user_complaint_snapshots(user: AppUser) -> int:
    from apps.chat.models import ChatReport
    from apps.reports.models import Complaint

    updated = 0
    for complaint in Complaint.objects.filter(reporter=user):
        complaint.reporter_snapshot = _anonymize_snapshot(complaint.reporter_snapshot)
        complaint.save(update_fields=["reporter_snapshot", "updated_at"])
        updated += 1
    for complaint in Complaint.objects.filter(accused=user):
        complaint.accused_snapshot = _anonymize_snapshot(complaint.accused_snapshot)
        complaint.accused = None
        complaint.save(update_fields=["accused_snapshot", "accused", "updated_at"])
        updated += 1
    for report in ChatReport.objects.filter(reporter=user):
        if hasattr(report, "reporter_snapshot"):
            report.reporter_snapshot = _anonymize_snapshot(getattr(report, "reporter_snapshot", {}))
            report.save(update_fields=["reporter_snapshot"])
            updated += 1
    return updated


def revoke_app_tokens(user: AppUser) -> None:
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

        OutstandingToken.objects.filter(user_id=user.id).delete()
    except Exception:
        pass


def log_data_subject_action(
    *,
    action: str,
    source: str,
    user: AppUser | None = None,
    staff=None,
    detail: str = "",
) -> DataSubjectRequestLog:
    return DataSubjectRequestLog.objects.create(
        action=action,
        source=source,
        user_id=user.id if user else None,
        user_email=(user.email or "") if user else "",
        user_phone=(user.phone or "") if user else "",
        staff=staff,
        detail=detail,
    )


@transaction.atomic
def delete_user_account(
    user: AppUser,
    *,
    source: str,
    staff=None,
    anonymize_complaints: bool | None = None,
) -> dict:
    config = PrivacyRetentionConfig.get_solo()
    if anonymize_complaints is None:
        anonymize_complaints = config.anonymize_complaint_snapshots_on_delete

    email = user.email or ""
    phone = user.phone or ""
    user_id = user.id

    if anonymize_complaints:
        anonymize_user_complaint_snapshots(user)

    revoke_app_tokens(user)
    user.delete()

    log_data_subject_action(
        action=DataSubjectRequestLog.ACTION_DELETE,
        source=source,
        user=None,
        staff=staff,
        detail=f"Deleted user {user_id} ({email or phone})",
    )
    return {
        "deleted": True,
        "user_id": str(user_id),
        "anonymized_complaints": anonymize_complaints,
    }


def apply_retention_policies(*, purge_inactive: bool = False) -> dict:
    """Purge aged operational logs and optionally deactivated accounts."""
    config = PrivacyRetentionConfig.get_solo()
    now = timezone.now()
    stats = {
        "login_lockouts": 0,
        "otps": 0,
        "password_reset_tokens": 0,
        "staff_login_attempts": 0,
        "chat_messages": 0,
        "inactive_accounts": 0,
    }

    if config.login_lockout_retention_days > 0:
        cutoff = now - timedelta(days=config.login_lockout_retention_days)
        qs = LoginLockout.objects.filter(last_failed_at__lt=cutoff)
        stats["login_lockouts"], _ = qs.delete()

    if config.otp_retention_days > 0:
        cutoff = now - timedelta(days=config.otp_retention_days)
        qs = OneTimePassword.objects.filter(created_at__lt=cutoff)
        stats["otps"], _ = qs.delete()

    if config.password_reset_token_retention_days > 0:
        cutoff = now - timedelta(days=config.password_reset_token_retention_days)
        qs = PasswordResetToken.objects.filter(created_at__lt=cutoff)
        stats["password_reset_tokens"], _ = qs.delete()

    if config.staff_login_attempt_retention_days > 0:
        from apps.staff.models import LoginAttempt

        cutoff = now - timedelta(days=config.staff_login_attempt_retention_days)
        qs = LoginAttempt.objects.filter(attempted_at__lt=cutoff)
        stats["staff_login_attempts"], _ = qs.delete()

    if config.chat_message_retention_days > 0:
        from apps.chat.models import ChatMessage

        cutoff = now - timedelta(days=config.chat_message_retention_days)
        qs = ChatMessage.objects.filter(created_at__lt=cutoff)
        stats["chat_messages"], _ = qs.delete()

    if purge_inactive and config.inactive_account_retention_days > 0:
        from django.db.models import Q

        cutoff = now - timedelta(days=config.inactive_account_retention_days)
        inactive = AppUser.objects.filter(
            is_active=False,
            account_status=AppUser.STATUS_DEACTIVATED,
        ).filter(Q(last_seen__lt=cutoff) | Q(last_seen__isnull=True, date_joined__lt=cutoff))
        for user in inactive.iterator():
            delete_user_account(user, source=DataSubjectRequestLog.SOURCE_SYSTEM)
            stats["inactive_accounts"] += 1

    log_data_subject_action(
        action=DataSubjectRequestLog.ACTION_RETENTION_PURGE,
        source=DataSubjectRequestLog.SOURCE_SYSTEM,
        detail=str(stats),
    )
    return stats
