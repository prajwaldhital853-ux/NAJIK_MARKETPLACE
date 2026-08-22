"""Seller wallet operations — atomic, bypass-resistant."""

from django.core.exceptions import ValidationError
from django.db import transaction

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


def get_listing_fee_paisa() -> int:
    cfg = SellerPaymentConfig.get_solo()
    if not cfg.is_active:
        return 0
    return rupees_to_paisa(max(0, cfg.listing_fee_rupees))


def get_or_create_wallet(provider) -> SellerWallet:
    wallet, _ = SellerWallet.objects.get_or_create(provider=provider)
    return wallet


def can_afford_listing(provider) -> bool:
    fee = get_listing_fee_paisa()
    if fee <= 0:
        return True
    wallet = SellerWallet.objects.filter(provider=provider).first()
    balance = wallet.balance_paisa if wallet else 0
    return balance >= fee


def seller_publish_blocked_message(provider) -> str | None:
    fee = get_listing_fee_paisa()
    if fee <= 0:
        return None
    wallet = SellerWallet.objects.filter(provider=provider).first()
    balance = wallet.balance_paisa if wallet else 0
    if balance < fee:
        return (
            f"Insufficient balance ({paisa_to_label(balance)}). "
            f"Each live listing costs {SellerPaymentConfig.get_solo().listing_fee_label}. "
            "Add funds in Payments and wait for admin approval."
        )
    return None


@transaction.atomic
def deduct_listing_fee(provider, listing):
    fee = get_listing_fee_paisa()
    if fee <= 0:
        return None
    if SellerWalletTransaction.objects.filter(listing=listing, kind=SellerWalletTransaction.KIND_LISTING_FEE).exists():
        return None
    wallet = SellerWallet.objects.select_for_update().get_or_create(provider=provider)[0]
    if wallet.balance_paisa < fee:
        raise InsufficientBalanceError("Insufficient balance to publish this listing.")
    wallet.balance_paisa -= fee
    wallet.save(update_fields=["balance_paisa", "updated_at"])
    return SellerWalletTransaction.objects.create(
        wallet=wallet,
        kind=SellerWalletTransaction.KIND_LISTING_FEE,
        amount_paisa=-fee,
        balance_after_paisa=wallet.balance_paisa,
        listing=listing,
        note=f"Listing fee: {listing.title or listing.pk}",
    )


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
    return load


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
