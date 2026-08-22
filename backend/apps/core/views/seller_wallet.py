import mimetypes

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse, HttpResponse
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.permissions import IsAppUser
from apps.core.models import SellerLoadRequest, SellerPaymentConfig, SellerWallet, SellerWalletTransaction
from apps.core.seller_wallet_service import (
    approve_load_request,
    create_load_request,
    get_or_create_wallet,
    paisa_to_label,
    reject_load_request,
    admin_adjust_wallet,
    refund_listing_fee,
    rupees_to_paisa,
)
from apps.listings.models import Listing
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.verification.serializers import file_from_data_uri


def payment_config_payload(request, cfg: SellerPaymentConfig) -> dict:
    qr_url = ""
    if cfg.qr_code:
        stamp = int(cfg.updated_at.timestamp()) if cfg.updated_at else 0
        qr_url = request.build_absolute_uri(f"/api/app-control/seller-payments/qr/?v={stamp}")
    return {
        "is_active": cfg.is_active,
        "listing_fee_rupees": cfg.listing_fee_rupees,
        "listing_fee_label": cfg.listing_fee_label,
        "min_load_rupees": cfg.min_load_rupees,
        "max_load_rupees": cfg.max_load_rupees,
        "bank_name": cfg.bank_name,
        "bank_account_name": cfg.bank_account_name,
        "bank_account_number": cfg.bank_account_number,
        "bank_branch": cfg.bank_branch,
        "payment_instructions": cfg.payment_instructions,
        "qr_code_url": qr_url,
    }


def transaction_payload(tx: SellerWalletTransaction) -> dict:
    listing_title = ""
    if tx.listing_id:
        listing_title = tx.listing.title if tx.listing else ""
    sign = "+" if tx.amount_paisa >= 0 else "-"
    return {
        "id": str(tx.id),
        "kind": tx.kind,
        "amount_paisa": tx.amount_paisa,
        "amount_label": f"{sign}{paisa_to_label(abs(tx.amount_paisa))}",
        "balance_after_paisa": tx.balance_after_paisa,
        "balance_after_label": paisa_to_label(tx.balance_after_paisa),
        "listing_id": str(tx.listing_id) if tx.listing_id else None,
        "listing_title": listing_title,
        "note": tx.note,
        "created_at": tx.created_at,
    }


def load_request_payload(request, load: SellerLoadRequest) -> dict:
    proof_url = ""
    if load.proof_image:
        proof_url = request.build_absolute_uri(f"/api/admin/app-control/load-requests/{load.id}/proof/")
    return {
        "id": str(load.id),
        "amount_paisa": load.amount_paisa,
        "amount_label": paisa_to_label(load.amount_paisa),
        "payment_reference": load.payment_reference,
        "status": load.status,
        "admin_note": load.admin_note,
        "proof_url": proof_url,
        "created_at": load.created_at,
        "reviewed_at": load.reviewed_at,
    }


class PublicSellerPaymentConfigView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        cfg = SellerPaymentConfig.get_solo()
        return Response(payment_config_payload(request, cfg))


class PublicSellerPaymentQrView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        cfg = SellerPaymentConfig.get_solo()
        if not cfg.qr_code:
            return HttpResponse(status=404)
        content_type, _ = mimetypes.guess_type(cfg.qr_code.name)
        response = FileResponse(cfg.qr_code.open("rb"), content_type=content_type or "image/png")
        response["Cache-Control"] = "no-store, max-age=0"
        return response


class SellerPaymentsMeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        user = request.user
        if user.account_type != AppUser.ACCOUNT_PROVIDER:
            return Response({"detail": "Payments are for service providers."}, status=status.HTTP_403_FORBIDDEN)
        cfg = SellerPaymentConfig.get_solo()
        wallet = get_or_create_wallet(user)
        pending = SellerLoadRequest.objects.filter(
            provider=user,
            status=SellerLoadRequest.STATUS_PENDING,
        ).first()
        txs = (
            SellerWalletTransaction.objects.filter(wallet=wallet)
            .select_related("listing")
            .order_by("-created_at")[:80]
        )
        recent_loads = SellerLoadRequest.objects.filter(provider=user).order_by("-created_at")[:10]
        return Response(
            {
                "balance_paisa": wallet.balance_paisa,
                "balance_label": paisa_to_label(wallet.balance_paisa),
                "config": payment_config_payload(request, cfg),
                "pending_load": load_request_payload(request, pending) if pending else None,
                "can_request_load": pending is None and cfg.is_active,
                "transactions": [transaction_payload(tx) for tx in txs],
                "recent_load_requests": [load_request_payload(request, row) for row in recent_loads],
            }
        )


class SellerLoadRequestCreateView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request):
        user = request.user
        if user.account_type != AppUser.ACCOUNT_PROVIDER:
            return Response({"detail": "Payments are for service providers."}, status=status.HTTP_403_FORBIDDEN)
        try:
            amount = int(request.data.get("amount_rupees"))
        except (TypeError, ValueError):
            return Response({"detail": "Enter a valid amount in rupees."}, status=status.HTTP_400_BAD_REQUEST)
        proof = None
        proof_uri = request.data.get("proof_uri") or request.data.get("proof_image_uri")
        if proof_uri:
            try:
                proof = file_from_data_uri(proof_uri, "load_proof")
            except serializers.ValidationError as exc:
                detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
                return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
        try:
            load = create_load_request(
                user,
                amount,
                payment_reference=str(request.data.get("payment_reference") or ""),
                proof_file=proof,
            )
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(load_request_payload(request, load), status=status.HTTP_201_CREATED)


class StaffSellerPaymentConfigView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        cfg = SellerPaymentConfig.get_solo()
        return Response(payment_config_payload(request, cfg))

    def patch(self, request):
        cfg = SellerPaymentConfig.get_solo()
        if "listing_fee_rupees" in request.data:
            try:
                cfg.listing_fee_rupees = max(0, int(request.data.get("listing_fee_rupees")))
            except (TypeError, ValueError):
                return Response({"detail": "Invalid listing_fee_rupees."}, status=status.HTTP_400_BAD_REQUEST)
        if "listing_fee_label" in request.data:
            cfg.listing_fee_label = (request.data.get("listing_fee_label") or cfg.listing_fee_label).strip()[:40]
        if "min_load_rupees" in request.data:
            try:
                cfg.min_load_rupees = max(1, int(request.data.get("min_load_rupees")))
            except (TypeError, ValueError):
                return Response({"detail": "Invalid min_load_rupees."}, status=status.HTTP_400_BAD_REQUEST)
        if "max_load_rupees" in request.data:
            try:
                cfg.max_load_rupees = max(cfg.min_load_rupees, int(request.data.get("max_load_rupees")))
            except (TypeError, ValueError):
                return Response({"detail": "Invalid max_load_rupees."}, status=status.HTTP_400_BAD_REQUEST)
        for field in ("bank_name", "bank_account_name", "bank_account_number", "bank_branch"):
            if field in request.data:
                setattr(cfg, field, (request.data.get(field) or "").strip()[:120])
        if "payment_instructions" in request.data:
            cfg.payment_instructions = (request.data.get("payment_instructions") or "").strip()[:4000]
        if "is_active" in request.data:
            cfg.is_active = bool(request.data.get("is_active"))
        qr_uri = request.data.get("qr_code_uri") or request.data.get("qr_uri")
        if qr_uri:
            try:
                content = file_from_data_uri(qr_uri, "payment_qr")
            except serializers.ValidationError as exc:
                detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
                return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
            cfg.qr_code.save(content.name, content, save=False)
        cfg.save()
        return Response(payment_config_payload(request, cfg))


class StaffLoadRequestListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        status_filter = (request.query_params.get("status") or "").strip()
        qs = SellerLoadRequest.objects.select_related("provider").order_by("-created_at")
        if status_filter in {
            SellerLoadRequest.STATUS_PENDING,
            SellerLoadRequest.STATUS_APPROVED,
            SellerLoadRequest.STATUS_REJECTED,
        }:
            qs = qs.filter(status=status_filter)
        rows = qs[:300]
        return Response(
            [
                {
                    **load_request_payload(request, row),
                    "provider_id": str(row.provider_id),
                    "provider_name": row.provider.full_name or "",
                    "provider_phone": row.provider.phone or "",
                }
                for row in rows
            ]
        )


class StaffLoadRequestApproveView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            load = approve_load_request(pk, request.user)
        except SellerLoadRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(load_request_payload(request, load))


class StaffLoadRequestRejectView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        note = str(request.data.get("admin_note") or request.data.get("note") or "")
        try:
            load = reject_load_request(pk, request.user, note)
        except SellerLoadRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(load_request_payload(request, load))


class StaffLoadRequestProofView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        load = SellerLoadRequest.objects.filter(pk=pk).first()
        if not load or not load.proof_image:
            return HttpResponse(status=404)
        content_type, _ = mimetypes.guess_type(load.proof_image.name)
        return FileResponse(load.proof_image.open("rb"), content_type=content_type or "image/jpeg")


class StaffSellerWalletListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        provider_id = (request.query_params.get("provider") or "").strip()
        qs = SellerWallet.objects.select_related("provider").order_by("-updated_at")
        if provider_id:
            qs = qs.filter(provider_id=provider_id)
        return Response(
            [
                {
                    "provider_id": str(row.provider_id),
                    "provider_name": row.provider.full_name or "",
                    "provider_phone": row.provider.phone or "",
                    "balance_paisa": row.balance_paisa,
                    "balance_label": paisa_to_label(row.balance_paisa),
                    "updated_at": row.updated_at,
                }
                for row in qs[:200]
            ]
        )


class StaffSellerWalletDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, provider_id):
        try:
            provider = AppUser.objects.get(pk=provider_id, account_type=AppUser.ACCOUNT_PROVIDER)
        except AppUser.DoesNotExist:
            return Response({"detail": "Provider not found."}, status=status.HTTP_404_NOT_FOUND)
        wallet = get_or_create_wallet(provider)
        txs = (
            SellerWalletTransaction.objects.filter(wallet=wallet)
            .select_related("listing")
            .order_by("-created_at")[:200]
        )
        loads = SellerLoadRequest.objects.filter(provider=provider).order_by("-created_at")[:50]
        return Response(
            {
                "provider_id": str(provider.pk),
                "provider_name": provider.full_name or "",
                "provider_phone": provider.phone or "",
                "balance_paisa": wallet.balance_paisa,
                "balance_label": paisa_to_label(wallet.balance_paisa),
                "transactions": [transaction_payload(tx) for tx in txs],
                "load_requests": [load_request_payload(request, row) for row in loads],
            }
        )


class StaffSellerWalletAdjustView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, provider_id):
        try:
            provider = AppUser.objects.get(pk=provider_id, account_type=AppUser.ACCOUNT_PROVIDER)
        except AppUser.DoesNotExist:
            return Response({"detail": "Provider not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            amount_rupees = int(request.data.get("amount_rupees"))
        except (TypeError, ValueError):
            return Response({"detail": "Invalid amount_rupees."}, status=status.HTTP_400_BAD_REQUEST)
        note = str(request.data.get("note") or "")
        try:
            tx = admin_adjust_wallet(provider, amount_rupees, note, request.user)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(transaction_payload(tx))


class StaffListingFeeRefundView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, listing_id):
        listing = Listing.objects.filter(pk=listing_id).first()
        if not listing:
            return Response({"detail": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)
        note = str(request.data.get("note") or "")
        try:
            tx = refund_listing_fee(listing, request.user, note)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(transaction_payload(tx))
