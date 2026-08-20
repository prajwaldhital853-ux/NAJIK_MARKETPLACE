import base64
import io
import mimetypes

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
from apps.verification.models import ProviderIdCard, ensure_provider_id_card
from apps.verification.serializers import provider_id_card_payload, staff_id_card_payload


def _qr_png_bytes(data: str) -> bytes:
    img = qrcode.make(data, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _qr_png_response(data: str) -> HttpResponse:
    return HttpResponse(_qr_png_bytes(data), content_type="image/png")


def _qr_data_uri(data: str) -> str:
    return "data:image/png;base64," + base64.b64encode(_qr_png_bytes(data)).decode("ascii")


def _file_data_uri(field) -> str:
    if not field:
        return ""
    try:
        raw = field.open("rb").read()
        content_type, _ = mimetypes.guess_type(field.name)
        mime = content_type or "image/jpeg"
        return f"data:{mime};base64," + base64.b64encode(raw).decode("ascii")
    except Exception:
        return ""


class ProviderIdCardMeView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
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

    def get(self, request):
        if request.user.account_type != "provider":
            return Response(status=status.HTTP_403_FORBIDDEN)
        card = ensure_provider_id_card(request.user)
        url = request.build_absolute_uri(f"/api/cards/verify/{card.verify_token}/")
        return _qr_png_response(url)


class ProviderIdCardMePrintView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        if request.user.account_type != "provider":
            return Response(status=status.HTTP_403_FORBIDDEN)
        card = ensure_provider_id_card(request.user)
        if not card.can_download:
            return Response(
                {"detail": "Download and print are blocked until admin approves your request."},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = provider_id_card_payload(card, request=request)
        app = getattr(request.user, "provider_application", None)
        photo = _file_data_uri(app.photo if app else None)
        verify_url = data["verify_url"]
        qr = _qr_data_uri(verify_url)
        joined = ""
        if data.get("joined_on"):
            try:
                joined = data["joined_on"].strftime("%d %b %Y")
            except Exception:
                joined = str(data["joined_on"])[:10]
        status_label = "VERIFIED" if data["is_verified"] else "PENDING"
        html = f"""<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{data['card_code']}</title>
<style>
body{{font-family:Arial,sans-serif;background:#eef2f0;margin:0;padding:16px;color:#111}}
.wrap{{display:flex;flex-wrap:wrap;gap:18px;justify-content:center}}
.card{{width:320px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #d7e3db}}
.head{{text-align:center;padding:16px 12px 8px}}
.brand{{font-weight:800;font-size:22px;letter-spacing:1px}}
.tag{{font-size:10px;letter-spacing:1px;margin-top:4px}}
.photo{{width:110px;height:110px;border-radius:55px;object-fit:cover;border:3px solid #1B7D2C;display:block;margin:8px auto;background:#e7f6ec}}
.name{{text-align:center;font-weight:800;font-size:18px;margin-top:8px}}
.role{{text-align:center;color:#1B7D2C;font-weight:700;font-size:12px}}
.rows{{padding:12px 18px 8px;font-size:12px}}
.row{{margin:6px 0}} .label{{color:#64748b}}
.foot{{background:linear-gradient(180deg,#1B7D2C,#0f5a1e);color:#fff;padding:14px;display:flex;justify-content:space-between;align-items:flex-end;min-height:78px}}
.qr{{width:64px;height:64px;background:#fff;padding:4px;border-radius:6px}}
.back-top{{background:#1B7D2C;color:#fff;text-align:center;padding:28px 12px}}
.section{{margin:12px 14px;border:1px solid #d7e3db;border-radius:10px;overflow:hidden}}
.section h3{{margin:0;background:#1B7D2C;color:#fff;font-size:11px;padding:8px 10px}}
.section div{{padding:10px;font-size:11px;line-height:1.45;color:#334155}}
.verify{{text-align:center;padding:10px}}
@media print {{ body{{background:#fff}} .card{{break-inside:avoid}} }}
</style></head><body>
<div class="wrap">
  <div class="card">
    <div class="head"><div class="brand">NAJIK</div><div class="tag">— EVERYTHING NEAR YOU —</div>
      <img class="photo" src="{photo}"/>
      <div class="name">{data['full_name']}</div><div class="role">SERVICE PROVIDER</div>
    </div>
    <div class="rows">
      <div class="row"><span class="label">Provider ID:</span> {data['card_code']}</div>
      <div class="row"><span class="label">Category:</span> {data['category'] or '—'}</div>
      <div class="row"><span class="label">Phone:</span> {data['phone'] or '—'}</div>
      <div class="row"><span class="label">Email:</span> {data['email'] or '—'}</div>
      <div class="row"><span class="label">Joined On:</span> {joined or '—'}</div>
    </div>
    <div class="foot">
      <img class="qr" src="{qr}"/>
      <div style="text-align:right;font-size:10px">Authorized Signatory</div>
    </div>
  </div>
  <div class="card">
    <div class="back-top"><div class="brand" style="color:#fff">NAJIK</div><div class="tag">EVERYTHING NEAR YOU</div></div>
    <div class="section"><h3>TERMS & CONDITIONS</h3><div>
      • This ID is property of NAJIK.<br/>
      • Non-transferable. Misuse may lead to account suspension.<br/>
      • Follow NAJIK marketplace terms at all times.<br/>
      • Return or destroy if your account is closed.
    </div></div>
    <div class="section"><h3>EMERGENCY CONTACT</h3><div>01-5970123<br/>support@najik.com</div></div>
    <div class="verify">
      <div style="color:#1B7D2C;font-weight:700;font-size:12px;margin-bottom:8px">SCAN TO VERIFY</div>
      <img class="qr" style="width:120px;height:120px;margin:0 auto;display:block" src="{qr}"/>
      <div style="color:#1B7D2C;font-weight:800;margin-top:8px">{status_label} · Valid ID</div>
    </div>
  </div>
</div>
<script>window.onload=function(){{setTimeout(function(){{window.print()}},400)}}</script>
</body></html>"""
        return HttpResponse(html, content_type="text/html")


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
        card = get_object_or_404(
            ProviderIdCard.objects.select_related("owner", "owner__provider_application"),
            pk=pk,
        )
        action = (request.data.get("action") or "").strip()
        note = (request.data.get("note") or "").strip()
        if action == "approve":
            card.approve(staff=request.user, note=note)
        elif action == "revoke":
            card.revoke(note=note)
        elif action == "block":
            card.revoke(note=note or "Blocked by admin")
        else:
            return Response(
                {"detail": "Use action: approve, revoke, or block."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(staff_id_card_payload(card, request=request))
