"""Seller wallet operations — atomic, bypass-resistant."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum

from apps.core.models.seller_wallet import (
    SellerLoadRequest,
    SellerPaymentConfig,
    SellerWallet,
    SellerWalletTransaction,
)


class InsufficientBalanceError(ValidationError):
    pass


def rupees_to_paisa(rupees: int) -> int:
    return int(rupees) * 100


def paisa_to_label(paisa: int) -> str:
    return f"Rs. {paisa // 100:,}"


def parse_price_rupees(value) -> int:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if not digits:
        return 0
    try:
        return max(0, int(digits))
    except ValueError:
        return 0


def normalize_listing_fee_tiers(raw) -> list[dict]:
    rows = []
    if not isinstance(raw, list):
        return rows
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            min_rupees = max(0, int(item.get("min_rupees") or 0))
            max_raw = item.get("max_rupees")
            if max_raw in (None, "", "unlimited"):
                max_rupees = None
            else:
                max_rupees = int(max_raw)
                if max_rupees <= 0:
                    max_rupees = None
                elif max_rupees < min_rupees:
                    max_rupees = min_rupees
            fee_rupees = max(0, int(item.get("fee_rupees") or 0))
        except (TypeError, ValueError):
            continue
        rows.append({"min_rupees": min_rupees, "max_rupees": max_rupees, "fee_rupees": fee_rupees})
    rows.sort(key=lambda row: (row["min_rupees"], 10**12 if row["max_rupees"] is None else row["max_rupees"]))
    # Ignore admin UI placeholder: 0 and above with Rs. 0 fee (not a real band).
    if len(rows) == 1 and rows[0]["min_rupees"] == 0 and rows[0]["max_rupees"] is None and rows[0]["fee_rupees"] == 0:
        return []
    return rows


def listing_fee_rupees_for_price(price_rupees: int, cfg: SellerPaymentConfig | None = None) -> int:
    cfg = cfg or SellerPaymentConfig.get_solo()
    if not cfg.is_active:
        return 0
    price = max(0, int(price_rupees or 0))
    for row in normalize_listing_fee_tiers(cfg.listing_fee_tiers):
        top = row["max_rupees"]
        if price >= row["min_rupees"] and (top is None or price <= top):
            return row["fee_rupees"]
    return max(0, int(cfg.listing_fee_rupees or 0))


def listing_price_rupees(listing) -> int:
    return parse_price_rupees(getattr(listing, "price", None))


def get_listing_fee_paisa(price_rupees: int | None = None, listing=None) -> int:
    if listing is not None and price_rupees is None:
        price_rupees = listing_price_rupees(listing)
    return rupees_to_paisa(listing_fee_rupees_for_price(price_rupees or 0))


def get_or_create_wallet(provider) -> SellerWallet:
    wallet, _ = SellerWallet.objects.get_or_create(provider=provider)
    return wallet


def wallet_balance_breakdown(wallet: SellerWallet) -> tuple[int, int]:
    """Refer & Earn remaining and loaded remaining. Debits consume invite first."""
    refer_credited = (
        SellerWalletTransaction.objects.filter(
            wallet=wallet,
            kind=SellerWalletTransaction.KIND_REFERRAL_REWARD,
        ).aggregate(total=Sum("amount_paisa"))["total"]
        or 0
    )
    debit_paisa = (
        SellerWalletTransaction.objects.filter(
            wallet=wallet,
            kind__in=[
                SellerWalletTransaction.KIND_LISTING_FEE,
                SellerWalletTransaction.KIND_BOOST_FEE,
                SellerWalletTransaction.KIND_ADMIN_DEBIT,
            ],
        ).aggregate(total=Sum("amount_paisa"))["total"]
        or 0
    )
    refunds_paisa = (
        SellerWalletTransaction.objects.filter(
            wallet=wallet,
            kind=SellerWalletTransaction.KIND_REFUND,
        ).aggregate(total=Sum("amount_paisa"))["total"]
        or 0
    )
    net_debits = max(0, abs(int(debit_paisa)) - max(0, int(refunds_paisa)))
    refer_credited = int(refer_credited)
    refer_consumed = min(refer_credited, net_debits)
    refer_earn_paisa = max(0, refer_credited - refer_consumed)
    loaded_paisa = max(0, int(wallet.balance_paisa) - refer_earn_paisa)
    return refer_earn_paisa, loaded_paisa


def can_afford_listing(provider, price_rupees: int = 0) -> bool:
    fee = get_listing_fee_paisa(price_rupees=price_rupees)
    if fee <= 0:
        return True
    wallet = SellerWallet.objects.filter(provider=provider).first()
    balance = wallet.balance_paisa if wallet else 0
    return balance >= fee


def seller_publish_blocked_message(provider, price_rupees: int = 0) -> str | None:
    cfg = SellerPaymentConfig.get_solo()
    fee_rupees = listing_fee_rupees_for_price(price_rupees, cfg)
    fee = rupees_to_paisa(fee_rupees)
    if fee <= 0:
        return None
    wallet = SellerWallet.objects.filter(provider=provider).first()
    balance = wallet.balance_paisa if wallet else 0
    if balance < fee:
        return (
            f"Insufficient balance ({paisa_to_label(balance)}). "
            f"Publishing a Rs. {max(0, int(price_rupees)):,} listing costs {paisa_to_label(fee)}. "
            "Add funds in Payments and wait for admin approval."
        )
    return None


@transaction.atomic
def deduct_listing_fee(provider, listing):
    fee = get_listing_fee_paisa(listing=listing)
    if fee <= 0:
        return None
    if SellerWalletTransaction.objects.filter(listing=listing, kind=SellerWalletTransaction.KIND_LISTING_FEE).exists():
        return None
    wallet = SellerWallet.objects.select_for_update().get_or_create(provider=provider)[0]
    if wallet.balance_paisa < fee:
        raise InsufficientBalanceError(
            f"Insufficient balance to publish this listing. This listing costs {paisa_to_label(fee)} to post."
        )
    wallet.balance_paisa -= fee
    wallet.save(update_fields=["balance_paisa", "updated_at"])
    tx = SellerWalletTransaction.objects.create(
        wallet=wallet,
        kind=SellerWalletTransaction.KIND_LISTING_FEE,
        amount_paisa=-fee,
        balance_after_paisa=wallet.balance_paisa,
        listing=listing,
        note=f"Listing fee {paisa_to_label(fee)} for “{listing.title or listing.pk}” (ad price {paisa_to_label(rupees_to_paisa(listing_price_rupees(listing)))})",
    )
    from apps.notifications.models.inbox import InboxNotice
    from apps.notifications.services import notify_user

    notify_user(
        provider,
        "Listing fee charged",
        f"{paisa_to_label(fee)} deducted for “{listing.title or 'listing'}”. Balance: {paisa_to_label(wallet.balance_paisa)}.",
        kind=InboxNotice.KIND_OTHER,
        target="payments",
        target_id=str(listing.id),
        sender_name="NAJIK Payments",
    )
    return tx


@transaction.atomic
def create_load_request(provider, amount_rupees: int, payment_reference: str = "", proof_file=None):
    cfg = SellerPaymentConfig.get_solo()
    if not cfg.is_active:
        raise ValidationError("Payments are paused right now.")
    amount_rupees = int(amount_rupees)
    if amount_rupees <= 0:
        raise ValidationError("Enter a valid amount.")
    if amount_rupees < cfg.min_load_rupees:
        raise ValidationError(f"Minimum load is Rs. {cfg.min_load_rupees}.")
    if amount_rupees > cfg.max_load_rupees:
        raise ValidationError(f"Maximum load is Rs. {cfg.max_load_rupees}.")
    if SellerLoadRequest.objects.filter(provider=provider, status=SellerLoadRequest.STATUS_PENDING).exists():
        raise ValidationError("You already have a pending load request. Wait for admin approval or rejection.")
    ref = (payment_reference or "").strip()[:120]
    load = SellerLoadRequest.objects.create(
        provider=provider,
        amount_paisa=rupees_to_paisa(amount_rupees),
        payment_reference=ref,
    )
    if proof_file:
        load.proof_image.save(proof_file.name, proof_file, save=True)
    from apps.notifications.models.inbox import InboxNotice
    from apps.notifications.services import notify_user

    notify_user(
        load.provider,
        "Add-fund request submitted",
        f"You requested {paisa_to_label(load.amount_paisa)}. Admin will verify your bank payment.",
        kind=InboxNotice.KIND_OTHER,
        target="payments",
        target_id=str(load.id),
        sender_name="NAJIK Payments",
    )
    try:
        from apps.core.realtime import publish_event

        publish_event("load_requests_changed", {"id": str(load.id)})
    except Exception:
        pass
    return load


@transaction.atomic
def approve_load_request(load_id, staff_user):
    load = SellerLoadRequest.objects.select_for_update().get(pk=load_id)
    if load.status != SellerLoadRequest.STATUS_PENDING:
        raise ValidationError("This request is no longer pending.")
    wallet = SellerWallet.objects.select_for_update().get_or_create(provider=load.provider)[0]
    wallet.balance_paisa += load.amount_paisa
    wallet.save(update_fields=["balance_paisa", "updated_at"])
    from django.utils import timezone

    load.status = SellerLoadRequest.STATUS_APPROVED
    load.reviewed_by = staff_user
    load.reviewed_at = timezone.now()
    load.save(update_fields=["status", "reviewed_by", "reviewed_at"])
    SellerWalletTransaction.objects.create(
        wallet=wallet,
        kind=SellerWalletTransaction.KIND_LOAD,
        amount_paisa=load.amount_paisa,
        balance_after_paisa=wallet.balance_paisa,
        load_request=load,
        note=f"Load approved · ref {load.payment_reference or '—'}",
        created_by=staff_user,
    )
    from apps.notifications.models.inbox import InboxNotice
    from apps.notifications.services import notify_user

    notify_user(
        load.provider,
        "Payment approved",
        f"{paisa_to_label(load.amount_paisa)} was credited. New balance: {paisa_to_label(wallet.balance_paisa)}.",
        kind=InboxNotice.KIND_OTHER,
        target="payments",
        target_id=str(load.id),
        sender_name="NAJIK Admin",
    )
    try:
        from apps.core.realtime import publish_event

        publish_event("load_requests_changed", {"id": str(load.id)})
    except Exception:
        pass
    return load


@transaction.atomic
def reject_load_request(load_id, staff_user, admin_note: str):
    load = SellerLoadRequest.objects.select_for_update().get(pk=load_id)
    if load.status != SellerLoadRequest.STATUS_PENDING:
        raise ValidationError("This request is no longer pending.")
    from django.utils import timezone

    load.status = SellerLoadRequest.STATUS_REJECTED
    load.admin_note = (admin_note or "").strip()[:2000]
    load.reviewed_by = staff_user
    load.reviewed_at = timezone.now()
    load.save(update_fields=["status", "admin_note", "reviewed_by", "reviewed_at"])
    from apps.notifications.models.inbox import InboxNotice
    from apps.notifications.services import notify_user

    note_text = (admin_note or "").strip()
    body = f"Your {paisa_to_label(load.amount_paisa)} top-up was not approved."
    if note_text:
        body = f"{body} Reason: {note_text}"
    notify_user(
        load.provider,
        "Payment request rejected",
        body,
        kind=InboxNotice.KIND_OTHER,
        target="payments",
        target_id=str(load.id),
        sender_name="NAJIK Admin",
    )
    try:
        from apps.core.realtime import publish_event

        publish_event("load_requests_changed", {"id": str(load.id)})
    except Exception:
        pass
    return load


@transaction.atomic
def credit_referral_reward(referral):
    """Credit referrer wallet when a referral is earned (idempotent)."""
    from apps.accounts.models.referral import ReferEarnConfig, Referral

    if referral.status != Referral.STATUS_EARNED:
        return None
    amount_paisa = rupees_to_paisa(max(0, int(referral.reward_amount or 0)))
    if amount_paisa <= 0:
        return None
    referred = referral.referred
    referred_name = referred.full_name or referred.phone or "friend"
    referrer = referral.referrer
    referrer_name = referrer.full_name or referrer.phone or "Your friend"
    amount_label = paisa_to_label(amount_paisa)
    ref_tag = f"ref:{referral.pk}"
    note = f"Invite & Earn · {ref_tag} · {referred_name}"
    wallet = SellerWallet.objects.select_for_update().get_or_create(provider=referral.referrer)[0]
    if SellerWalletTransaction.objects.filter(
        wallet=wallet,
        kind=SellerWalletTransaction.KIND_REFERRAL_REWARD,
        note__contains=ref_tag,
    ).exists():
        return None
    wallet.balance_paisa += amount_paisa
    wallet.save(update_fields=["balance_paisa", "updated_at"])
    tx = SellerWalletTransaction.objects.create(
        wallet=wallet,
        kind=SellerWalletTransaction.KIND_REFERRAL_REWARD,
        amount_paisa=amount_paisa,
        balance_after_paisa=wallet.balance_paisa,
        note=note,
    )
    from apps.notifications.models.inbox import InboxNotice
    from apps.notifications.services import notify_user

    if referral.audience == ReferEarnConfig.AUDIENCE_USER:
        notify_user(
            referrer,
            "Refer & Earn reward",
            f"{amount_label} credited — {referred_name} joined NAJIK with your invite code.",
            kind=InboxNotice.KIND_OTHER,
            target="invite",
            target_id=str(referral.pk),
            sender_name="NAJIK",
        )
        notify_user(
            referred,
            "You helped a friend earn",
            f"Thank you for joining with their code — {referrer_name} earned {amount_label} in Refer & Earn.",
            kind=InboxNotice.KIND_OTHER,
            target="invite",
            target_id=str(referral.pk),
            sender_name=referrer_name[:120],
        )
    else:
        notify_user(
            referrer,
            "Refer & Earn reward",
            f"{amount_label} credited — {referred_name} published their first live listing.",
            kind=InboxNotice.KIND_OTHER,
            target="invite",
            target_id=str(referral.pk),
            sender_name="NAJIK",
        )
        notify_user(
            referred,
            "You helped a friend earn",
            f"Your first live listing helped {referrer_name} earn {amount_label} in Refer & Earn. Thank you for joining with their code!",
            kind=InboxNotice.KIND_OTHER,
            target="invite",
            target_id=str(referral.pk),
            sender_name=referrer_name[:120],
        )
    return tx


def sync_referral_wallet_credits(referrer=None):
    """Credit wallet for earned referrals that were not paid yet (backfill / recovery)."""
    from apps.accounts.models.referral import Referral

    qs = Referral.objects.filter(status=Referral.STATUS_EARNED).select_related("referrer", "referred")
    if referrer is not None:
        qs = qs.filter(referrer=referrer)
    for ref in qs:
        credit_referral_reward(ref)


@transaction.atomic
def admin_adjust_wallet(provider, amount_rupees: int, note: str, staff_user):
    amount_paisa = rupees_to_paisa(amount_rupees)
    if amount_paisa == 0:
        raise ValidationError("Amount cannot be zero.")
    wallet = SellerWallet.objects.select_for_update().get_or_create(provider=provider)[0]
    new_balance = wallet.balance_paisa + amount_paisa
    if new_balance < 0:
        raise ValidationError("Adjustment would make balance negative.")
    wallet.balance_paisa = new_balance
    wallet.save(update_fields=["balance_paisa", "updated_at"])
    kind = (
        SellerWalletTransaction.KIND_ADMIN_CREDIT
        if amount_paisa > 0
        else SellerWalletTransaction.KIND_ADMIN_DEBIT
    )
    return SellerWalletTransaction.objects.create(
        wallet=wallet,
        kind=kind,
        amount_paisa=amount_paisa,
        balance_after_paisa=wallet.balance_paisa,
        note=(note or "").strip()[:2000],
        created_by=staff_user,
    )


@transaction.atomic
def refund_listing_fee(listing, staff_user, note: str = ""):
    tx = (
        SellerWalletTransaction.objects.select_for_update()
        .filter(listing=listing, kind=SellerWalletTransaction.KIND_LISTING_FEE)
        .first()
    )
    if not tx:
        raise ValidationError("No listing fee found for this listing.")
    refund_exists = SellerWalletTransaction.objects.filter(
        listing=listing,
        kind=SellerWalletTransaction.KIND_REFUND,
    ).exists()
    if refund_exists:
        raise ValidationError("This listing fee was already refunded.")
    fee = abs(tx.amount_paisa)
    wallet = SellerWallet.objects.select_for_update().get(pk=tx.wallet_id)
    wallet.balance_paisa += fee
    wallet.save(update_fields=["balance_paisa", "updated_at"])
    return SellerWalletTransaction.objects.create(
        wallet=wallet,
        kind=SellerWalletTransaction.KIND_REFUND,
        amount_paisa=fee,
        balance_after_paisa=wallet.balance_paisa,
        listing=listing,
        note=(note or "Listing fee refund").strip()[:2000],
        created_by=staff_user,
    )
