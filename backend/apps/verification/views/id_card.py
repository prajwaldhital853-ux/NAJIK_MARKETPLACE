import io

import qrcode
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.permissions import IsAppUser
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import require_rbac_method
from apps.verification.models import ProviderIdCard, ensure_provider_id_card
from apps.verification.serializers import provider_id_card_payload, staff_id_card_payload


def _qr_png_bytes(data: str) -> bytes:
    img = qrcode.make(data, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _qr_png_response(data: str) -> HttpResponse:
    return HttpResponse(_qr_png_bytes(data), content_type="image/png")


class ProviderIdCardMeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    allow_inactive = True

    def get(self, request):
        if not request.user.is_active:
            status_label = getattr(request.user, "account_status", "") or "deactivated"
            return Response(
                {"detail": f"Your account is {status_label}. You cannot open your ID card."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.account_type != "provider":
            return Response({"detail": "Only service providers have an ID card."}, status=status.HTTP_403_FORBIDDEN)
        card = ensure_provider_id_card(request.user)
        return Response(provider_id_card_payload(card, request=request))

    def post(self, request):
        if request.user.account_type != "provider":
            return Response({"detail": "Only service providers have an ID card."}, status=status.HTTP_403_FORBIDDEN)
        card = ensure_provider_id_card(request.user)
        action = (request.data.get("action") or "request_download").strip()
        if action != "request_download":
            return Response({"detail": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST)
        if card.access_status == ProviderIdCard.ACCESS_APPROVED:
            return Response(provider_id_card_payload(card, request=request))
        card.request_download()
        return Response(provider_id_card_payload(card, request=request))


class ProviderIdCardMeQrView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    allow_inactive = True

    def get(self, request):
        if request.user.account_type != "provider":
            return Response(status=status.HTTP_403_FORBIDDEN)
        card = ensure_provider_id_card(request.user)
        url = request.build_absolute_uri(f"/api/cards/verify/{card.verify_token}/")
        return _qr_png_response(url)


class ProviderIdCardMePrintView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]
    allow_inactive = True

    def get(self, request):
        if request.user.account_type != "provider":
            return Response(status=status.HTTP_403_FORBIDDEN)
        card = ensure_provider_id_card(request.user)
        if not card.can_download:
            return Response(
                {"detail": "Download and print are blocked until admin approves your request."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from apps.verification.id_card_pdf import build_id_card_pdf

        pdf_bytes = build_id_card_pdf(card, request)
        filename = f"najik-id-{card.card_code}.pdf".replace(" ", "-")
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = str(len(pdf_bytes))
        return response


class PublicIdCardVerifyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        card = get_object_or_404(
            ProviderIdCard.objects.select_related("owner", "owner__provider_application"),
            verify_token=token,
        )
        app = getattr(card.owner, "provider_application", None)
        verified = bool(app and app.status == "verified")
        accept = (request.headers.get("Accept") or "").lower()
        wants_html = "text/html" in accept and "application/json" not in accept
        payload = {
            "valid": True,
            "verified": verified,
            "card_code": card.card_code,
            "full_name": (app.full_name if app else None) or card.owner.full_name or "",
            "category": (app.service_type if app else "") or "",
            "status_label": "VERIFIED" if verified else "NOT VERIFIED",
            "message": (
                "This NAJIK service provider ID is verified."
                if verified
                else "This card exists, but the seller is not verified yet."
            ),
        }
        if wants_html:
            color = "#1B7D2C" if verified else "#B45309"
            html = f"""<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>NAJIK ID Verify</title>
<style>
body{{font-family:system-ui,sans-serif;background:#f4f7f5;margin:0;padding:24px;color:#0f172a}}
.card{{max-width:420px;margin:40px auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.08)}}
.badge{{display:inline-block;background:{color};color:#fff;font-weight:700;padding:6px 12px;border-radius:999px;font-size:12px}}
h1{{margin:16px 0 4px;font-size:22px}} p{{color:#475569;line-height:1.5}}
code{{background:#eef2f6;padding:2px 6px;border-radius:6px}}
</style></head><body><div class="card">
<span class="badge">{payload['status_label']}</span>
<h1>{payload['full_name'] or 'NAJIK Seller'}</h1>
<p><strong>Provider ID:</strong> <code>{payload['card_code']}</code></p>
<p><strong>Category:</strong> {payload['category'] or '—'}</p>
<p>{payload['message']}</p>
</div></body></html>"""
            return HttpResponse(html, content_type="text/html")
        return Response(payload)


class PublicIdCardVerifyQrView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        card = get_object_or_404(ProviderIdCard, verify_token=token)
        url = request.build_absolute_uri(f"/api/cards/verify/{card.verify_token}/")
        return _qr_png_response(url)


class StaffIdCardListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        qs = ProviderIdCard.objects.select_related("owner", "owner__provider_application").all()
        status_filter = (request.query_params.get("status") or "").strip()
        if status_filter in {
            ProviderIdCard.ACCESS_BLOCKED,
            ProviderIdCard.ACCESS_REQUESTED,
            ProviderIdCard.ACCESS_APPROVED,
        }:
            qs = qs.filter(access_status=status_filter)
        return Response([staff_id_card_payload(card, request=request) for card in qs])


class StaffIdCardDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        require_rbac_method(request.user, "kyc_verification", "PATCH")
        card = get_object_or_404(
            ProviderIdCard.objects.select_related("owner", "owner__provider_application"),
            pk=pk,
        )
        action = (request.data.get("action") or "").strip()
        note = (request.data.get("note") or "").strip()
        if action == "approve" or action == "unblock":
            card.approve(staff=request.user, note=note)
        elif action == "revoke":
            card.revoke(note=note)
        elif action == "block":
            card.revoke(note=note or "Blocked by admin")
        else:
            return Response(
                {"detail": "Use action: approve, unblock, revoke, or block."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(staff_id_card_payload(card, request=request))
