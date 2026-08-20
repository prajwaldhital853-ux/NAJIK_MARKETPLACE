"""Generate a two-page PDF (front + back) for a provider ID card."""

from __future__ import annotations

import io
from pathlib import Path

import qrcode
from django.conf import settings
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from apps.core.models import BrandingConfig
from apps.core.views.branding import (
    DEFAULT_EMERGENCY_EMAIL,
    DEFAULT_EMERGENCY_PHONE,
    DEFAULT_WEBSITE,
    ensure_default_signatory,
)

GREEN = HexColor("#1B7D2C")
MUTED = HexColor("#64748B")
INK = HexColor("#0F172A")
BORDER = HexColor("#D7E3DB")
PAGE_BG = HexColor("#EEF2F0")

# Portrait card roughly matching the in-app visual proportions.
CARD_W = 90 * mm
CARD_H = 145 * mm


def _qr_reader(data: str, box_size: int = 8) -> ImageReader:
    img = qrcode.make(data, box_size=box_size, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def _field_reader(field, *, max_side: int | None = None) -> ImageReader | None:
    if not field:
        return None
    try:
        with field.open("rb") as fh:
            raw = fh.read()
        if not raw:
            return None
        if max_side:
            from PIL import Image as PILImage

            img = PILImage.open(io.BytesIO(raw))
            img.thumbnail((max_side, max_side), PILImage.Resampling.LANCZOS)
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
            out = io.BytesIO()
            img.save(out, format="PNG", optimize=True)
            out.seek(0)
            return ImageReader(out)
        return ImageReader(io.BytesIO(raw))
    except Exception:
        return None


def _path_reader(*candidates: Path) -> ImageReader | None:
    for path in candidates:
        if path.is_file():
            try:
                return ImageReader(str(path))
            except Exception:
                continue
    return None


def _back_brand_reader() -> ImageReader | None:
    root = Path(settings.BASE_DIR).parent
    return _path_reader(
        root / "apps" / "admin" / "public" / "id-card" / "back-brand.png",
        root / "apps" / "mobile" / "assets" / "id-card" / "back-brand.png",
    )


def _fmt_joined(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%d %b %Y")
    except Exception:
        return str(value)[:10]


def _draw_card_shell(c: canvas.Canvas, x: float, y: float):
    c.setFillColor(white)
    c.setStrokeColor(BORDER)
    c.setLineWidth(1)
    c.roundRect(x, y, CARD_W, CARD_H, 8 * mm, fill=1, stroke=1)


def _draw_front(
    c: canvas.Canvas,
    *,
    x: float,
    y: float,
    data: dict,
    photo: ImageReader | None,
    signature: ImageReader | None,
    qr: ImageReader,
):
    _draw_card_shell(c, x, y)

    # Top-right corner accent flush with card edges (SS2)
    corner_w = CARD_W * 0.42
    corner_h = corner_w * 0.52
    green_light = HexColor("#7AC943")
    cx0 = x + CARD_W - corner_w
    cy1 = y + CARD_H
    cy0 = cy1 - corner_h
    # Light lip
    lip = c.beginPath()
    lip.moveTo(cx0, cy1)
    lip.curveTo(cx0 + corner_w * 0.34, cy1 - corner_h * 0.08, cx0 + corner_w * 0.66, cy1 - corner_h * 0.47, x + CARD_W, y + CARD_H - corner_h)
    lip.lineTo(x + CARD_W, y + CARD_H - corner_h + 1.5 * mm)
    lip.curveTo(cx0 + corner_w * 0.66, cy1 - corner_h * 0.42, cx0 + corner_w * 0.34, cy1 - corner_h * 0.05, cx0, cy1)
    lip.close()
    c.setFillColor(green_light)
    c.drawPath(lip, fill=1, stroke=0)
    # Main green flush to top + right
    body = c.beginPath()
    body.moveTo(cx0, cy1)
    body.lineTo(x + CARD_W, cy1)
    body.lineTo(x + CARD_W, cy0)
    body.curveTo(cx0 + corner_w * 0.66, cy1 - corner_h * 0.47, cx0 + corner_w * 0.34, cy1 - corner_h * 0.08, cx0, cy1)
    body.close()
    c.setFillColor(GREEN)
    c.drawPath(body, fill=1, stroke=0)

    # Header — slightly larger brand text
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(x + CARD_W / 2, y + CARD_H - 15 * mm, "NAJIK")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    c.drawCentredString(x + CARD_W / 2, y + CARD_H - 19.5 * mm, "— EVERYTHING NEAR YOU —")

    # Photo
    photo_size = 28 * mm
    px = x + (CARD_W - photo_size) / 2
    py = y + CARD_H - 54 * mm
    c.setStrokeColor(GREEN)
    c.setLineWidth(2.2)
    c.setFillColor(HexColor("#E7F6EC"))
    c.circle(px + photo_size / 2, py + photo_size / 2, photo_size / 2 + 1.2 * mm, fill=1, stroke=1)
    if photo:
        c.saveState()
        path = c.beginPath()
        path.circle(px + photo_size / 2, py + photo_size / 2, photo_size / 2)
        c.clipPath(path, stroke=0)
        c.drawImage(photo, px, py, width=photo_size, height=photo_size, preserveAspectRatio=True, anchor="c", mask="auto")
        c.restoreState()

    # Name + role
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    name = (data.get("full_name") or "Service Provider")[:36]
    c.drawCentredString(x + CARD_W / 2, y + CARD_H - 60 * mm, name.upper())
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(x + CARD_W / 2, y + CARD_H - 65 * mm, data.get("role_label") or "SERVICE PROVIDER")

    # Detail rows
    rows = [
        ("Provider ID", data.get("card_code") or "—"),
        ("Category", data.get("category") or "—"),
        ("Phone", data.get("phone") or "—"),
        ("Email", data.get("email") or "—"),
        ("Joined On", _fmt_joined(data.get("joined_on"))),
    ]
    row_y = y + CARD_H - 74 * mm
    for label, value in rows:
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 7)
        c.drawString(x + 8 * mm, row_y, f"{label}:")
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(x + 30 * mm, row_y, str(value)[:42])
        row_y -= 5.2 * mm

    # Footer wave — same shape as mobile SVG (high left → low right).
    # Mobile SVG y grows downward; PDF y grows upward from card bottom.
    footer_h = 38 * mm

    def sy(frac: float) -> float:
        """Map SVG y-fraction (0=top of footer, 1=bottom) → PDF absolute y."""
        return y + footer_h * (1.0 - frac)

    # Light lip (drawn first, peeks above the main green)
    lip = c.beginPath()
    lip.moveTo(x, sy(0.08))
    lip.curveTo(x + CARD_W * 0.22, sy(-0.02), x + CARD_W * 0.42, sy(0.55), x + CARD_W * 0.62, sy(0.72))
    lip.curveTo(x + CARD_W * 0.78, sy(0.86), x + CARD_W * 0.9, sy(0.92), x + CARD_W, sy(0.95))
    lip.lineTo(x + CARD_W, sy(0.88))
    lip.curveTo(x + CARD_W * 0.9, sy(0.85), x + CARD_W * 0.78, sy(0.78), x + CARD_W * 0.62, sy(0.64))
    lip.curveTo(x + CARD_W * 0.42, sy(0.46), x + CARD_W * 0.22, sy(-0.08), x, sy(0.02))
    lip.close()
    c.setFillColor(green_light)
    c.drawPath(lip, fill=1, stroke=0)

    # Main green body
    wave = c.beginPath()
    wave.moveTo(x, y)
    wave.lineTo(x, sy(0.08))
    wave.curveTo(x + CARD_W * 0.22, sy(-0.02), x + CARD_W * 0.42, sy(0.55), x + CARD_W * 0.62, sy(0.72))
    wave.curveTo(x + CARD_W * 0.78, sy(0.86), x + CARD_W * 0.9, sy(0.92), x + CARD_W, sy(0.95))
    wave.lineTo(x + CARD_W, y)
    wave.close()
    c.setFillColor(GREEN)
    c.drawPath(wave, fill=1, stroke=0)

    # QR bottom-left inside the high green area (matches app)
    qr_size = 18 * mm
    qr_pad = 2 * mm
    qr_x = x + 6 * mm
    qr_y = y + 6 * mm
    c.setFillColor(white)
    c.roundRect(qr_x, qr_y, qr_size + qr_pad * 2, qr_size + qr_pad * 2, 2.2 * mm, fill=1, stroke=0)
    c.drawImage(qr, qr_x + qr_pad, qr_y + qr_pad, width=qr_size, height=qr_size, mask="auto")

    # Signature on the right, in the white area above the low dip
    sig_w, sig_h = 28 * mm, 11 * mm
    sig_x = x + CARD_W - sig_w - 6 * mm
    sig_y = sy(0.55) + 1 * mm
    if signature:
        c.drawImage(
            signature,
            sig_x,
            sig_y,
            width=sig_w,
            height=sig_h,
            preserveAspectRatio=True,
            mask="auto",
            anchor="sw",
        )
    c.setStrokeColor(GREEN)
    c.setLineWidth(1.1)
    c.line(sig_x + 1 * mm, sig_y - 1.2 * mm, sig_x + sig_w - 1 * mm, sig_y - 1.2 * mm)
    c.setFillColor(INK)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(sig_x + sig_w / 2, sig_y - 4.5 * mm, "Authorized Signatory")


def _draw_back(
    c: canvas.Canvas,
    *,
    x: float,
    y: float,
    data: dict,
    qr: ImageReader,
    brand: ImageReader | None,
    emergency_phone: str,
    emergency_email: str,
    website: str,
):
    _draw_card_shell(c, x, y)

    # Green header
    header_h = 32 * mm
    c.setFillColor(GREEN)
    path = c.beginPath()
    path.moveTo(x, y + CARD_H - header_h + 8 * mm)
    path.curveTo(
        x + CARD_W * 0.28,
        y + CARD_H - header_h - 6 * mm,
        x + CARD_W * 0.72,
        y + CARD_H - header_h - 6 * mm,
        x + CARD_W,
        y + CARD_H - header_h + 8 * mm,
    )
    path.lineTo(x + CARD_W, y + CARD_H)
    path.lineTo(x, y + CARD_H)
    path.close()
    c.drawPath(path, fill=1, stroke=0)

    if brand:
        c.drawImage(
            brand,
            x + (CARD_W - 42 * mm) / 2,
            y + CARD_H - 26 * mm,
            width=42 * mm,
            height=16 * mm,
            preserveAspectRatio=True,
            mask="auto",
            anchor="c",
        )
    else:
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(x + CARD_W / 2, y + CARD_H - 16 * mm, "NAJIK")
        c.setFont("Helvetica", 7)
        c.drawCentredString(x + CARD_W / 2, y + CARD_H - 21 * mm, "EVERYTHING NEAR YOU")

    def section(title: str, body_lines: list[str], top: float) -> float:
        c.setFillColor(GREEN)
        c.roundRect(x + 7 * mm, top - 5 * mm, CARD_W - 14 * mm, 5.5 * mm, 2 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(x + CARD_W / 2, top - 3.2 * mm, title)
        c.setFillColor(HexColor("#334155"))
        c.setFont("Helvetica", 7)
        ty = top - 10 * mm
        for line in body_lines:
            c.drawString(x + 10 * mm, ty, line[:58])
            ty -= 4 * mm
        return ty - 3 * mm

    next_y = section(
        "TERMS & CONDITIONS",
        [
            "• This ID is property of NAJIK.",
            "• Non-transferable. Misuse may lead to suspension.",
            "• Follow NAJIK marketplace terms at all times.",
            "• Return or destroy if your account is closed.",
        ],
        y + CARD_H - 40 * mm,
    )
    next_y = section(
        "EMERGENCY CONTACT",
        [emergency_phone, emergency_email, website.replace("https://", "").replace("http://", "")],
        next_y,
    )

    status_label = "VERIFIED" if data.get("is_verified") else "PENDING"
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(x + CARD_W / 2, next_y - 2 * mm, "SCAN TO VERIFY")

    qr_size = 28 * mm
    qx = x + (CARD_W - qr_size) / 2
    qy = y + 14 * mm
    c.setFillColor(white)
    c.setStrokeColor(BORDER)
    c.roundRect(qx - 2 * mm, qy - 2 * mm, qr_size + 4 * mm, qr_size + 4 * mm, 2 * mm, fill=1, stroke=1)
    c.drawImage(qr, qx, qy, width=qr_size, height=qr_size, mask="auto")

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(x + CARD_W / 2, y + 8 * mm, f"{status_label} · Valid ID")


def build_id_card_pdf(card, request) -> bytes:
    from apps.verification.serializers import provider_id_card_payload

    data = provider_id_card_payload(card, request=request)
    verify_url = data["verify_url"]
    qr = _qr_reader(verify_url)

    app = getattr(card.owner, "provider_application", None)
    photo = _field_reader(app.photo if app else None, max_side=512)

    config = ensure_default_signatory(BrandingConfig.get_solo())
    signature = _field_reader(config.authorized_signatory, max_side=400)
    phone = (config.emergency_phone or "").strip() or DEFAULT_EMERGENCY_PHONE
    email = (config.emergency_email or "").strip() or DEFAULT_EMERGENCY_EMAIL
    website = (config.website or "").strip() or DEFAULT_WEBSITE
    brand = _back_brand_reader()

    buf = io.BytesIO()
    # Page sized snugly around the card with a light margin.
    page_w = CARD_W + 20 * mm
    page_h = CARD_H + 20 * mm
    c = canvas.Canvas(buf, pagesize=(page_w, page_h))

    def paint_page(draw_fn):
        c.setFillColor(PAGE_BG)
        c.rect(0, 0, page_w, page_h, fill=1, stroke=0)
        draw_fn(c, x=(page_w - CARD_W) / 2, y=(page_h - CARD_H) / 2)

    paint_page(
        lambda c, x, y: _draw_front(c, x=x, y=y, data=data, photo=photo, signature=signature, qr=qr)
    )
    c.showPage()
    paint_page(
        lambda c, x, y: _draw_back(
            c,
            x=x,
            y=y,
            data=data,
            qr=qr,
            brand=brand,
            emergency_phone=phone,
            emergency_email=email,
            website=website,
        )
    )
    c.save()
    return buf.getvalue()
