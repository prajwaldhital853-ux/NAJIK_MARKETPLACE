"""Build a readable PDF personal data export for GDPR self-service."""
from __future__ import annotations

import io
import json
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from rest_framework.renderers import BaseRenderer

GREEN = colors.HexColor("#1B7D2C")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")


def _esc(value) -> str:
    if value is None:
        return "—"
    if isinstance(value, (dict, list)):
        return escape(json.dumps(value, ensure_ascii=False, default=str, indent=2))
    text = str(value).strip()
    return escape(text) if text else "—"


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ExportTitle",
            parent=base["Heading1"],
            fontSize=18,
            textColor=GREEN,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "ExportSubtitle",
            parent=base["Normal"],
            fontSize=10,
            textColor=MUTED,
            spaceAfter=14,
        ),
        "h2": ParagraphStyle(
            "ExportH2",
            parent=base["Heading2"],
            fontSize=13,
            textColor=INK,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "ExportBody",
            parent=base["Normal"],
            fontSize=9,
            leading=13,
            textColor=INK,
            spaceAfter=4,
        ),
        "mono": ParagraphStyle(
            "ExportMono",
            parent=base["Code"],
            fontSize=8,
            leading=11,
            textColor=INK,
            spaceAfter=6,
        ),
    }


def _section(story, styles, title: str, lines: list[str]):
    story.append(Paragraph(title, styles["h2"]))
    for line in lines:
        story.append(Paragraph(line, styles["body"]))
    story.append(Spacer(1, 4 * mm))


def _records_section(story, styles, title: str, rows: list[dict], fields: list[tuple[str, str]]):
    story.append(Paragraph(title, styles["h2"]))
    if not rows:
        story.append(Paragraph("No records.", styles["body"]))
        story.append(Spacer(1, 4 * mm))
        return
    for index, row in enumerate(rows[:50], start=1):
        parts = [f"<b>#{index}</b>"]
        for label, key in fields:
            val = row.get(key)
            if val not in (None, "", []):
                parts.append(f"{escape(label)}: {_esc(val)}")
        story.append(Paragraph(" · ".join(parts), styles["body"]))
    if len(rows) > 50:
        story.append(Paragraph(f"… and {len(rows) - 50} more rows not shown in this PDF.", styles["body"]))
    story.append(Spacer(1, 4 * mm))


def build_user_data_pdf(data: dict) -> bytes:
    profile = data.get("profile") or {}
    buffer = io.BytesIO()
    styles = _styles()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="NAJIK Personal Data Export",
        author="NAJIK Marketplace",
    )
    story = [
        Paragraph("NAJIK Personal Data Export", styles["title"]),
        Paragraph(
            f"Exported: {_esc(data.get('exported_at'))}<br/>"
            f"Account ID: {_esc(profile.get('id'))}<br/>"
            f"Format version: {_esc(data.get('format_version'))}",
            styles["subtitle"],
        ),
    ]

    _section(
        story,
        styles,
        "Profile",
        [
            f"<b>Full name:</b> {_esc(profile.get('full_name'))}",
            f"<b>Email:</b> {_esc(profile.get('email'))}",
            f"<b>Phone:</b> {_esc(profile.get('phone'))}",
            f"<b>Username:</b> {_esc(profile.get('username'))}",
            f"<b>Account type:</b> {_esc(profile.get('account_type'))}",
            f"<b>Account status:</b> {_esc(profile.get('account_status'))}",
            f"<b>Address:</b> {_esc(profile.get('address'))}",
            f"<b>Phone verified:</b> {_esc(profile.get('phone_verified'))}",
            f"<b>Email verified:</b> {_esc(profile.get('email_verified'))}",
            f"<b>Terms accepted:</b> {_esc(profile.get('terms_accepted_at'))}",
            f"<b>Privacy accepted:</b> {_esc(profile.get('privacy_accepted_at'))}",
            f"<b>Date joined:</b> {_esc(profile.get('date_joined'))}",
            f"<b>Last seen:</b> {_esc(profile.get('last_seen'))}",
        ],
    )

    _records_section(
        story,
        styles,
        f"Listings ({len(data.get('listings') or [])})",
        data.get("listings") or [],
        [("Title", "title"), ("Status", "status"), ("Category", "category"), ("Location", "location"), ("Price", "price")],
    )
    _records_section(
        story,
        styles,
        f"Chat messages ({len(data.get('chat_messages') or [])})",
        data.get("chat_messages") or [],
        [("Kind", "kind"), ("Text", "text"), ("When", "created_at")],
    )
    _records_section(
        story,
        styles,
        f"Reviews given ({len(data.get('reviews_given') or [])})",
        data.get("reviews_given") or [],
        [("Rating", "rating"), ("Text", "text"), ("When", "created_at")],
    )
    _records_section(
        story,
        styles,
        f"Reviews received ({len(data.get('reviews_received') or [])})",
        data.get("reviews_received") or [],
        [("Rating", "rating"), ("Text", "text"), ("When", "created_at")],
    )
    _records_section(
        story,
        styles,
        f"Saved listings ({len(data.get('saved_listings') or [])})",
        data.get("saved_listings") or [],
        [("Listing ID", "listing_id"), ("Saved", "created_at")],
    )
    _records_section(
        story,
        styles,
        f"Complaints filed ({len(data.get('complaints_filed') or [])})",
        data.get("complaints_filed") or [],
        [("Kind", "kind"), ("Status", "status"), ("Reason", "reason"), ("When", "created_at")],
    )

    kyc = data.get("kyc_application")
    if kyc:
        _section(
            story,
            styles,
            "KYC application",
            [
                f"<b>Status:</b> {_esc(kyc.get('status'))}",
                f"<b>Full name:</b> {_esc(kyc.get('full_name'))}",
                f"<b>Service type:</b> {_esc(kyc.get('service_type'))}",
                f"<b>Submitted:</b> {_esc(kyc.get('submitted_at'))}",
            ],
        )

    wallet = data.get("seller_wallet")
    if wallet:
        _section(
            story,
            styles,
            "Seller wallet",
            [
                f"<b>Balance (paisa):</b> {_esc(wallet.get('balance_paisa'))}",
                f"<b>Transactions:</b> {len(wallet.get('transactions') or [])}",
                f"<b>Load requests:</b> {len(wallet.get('load_requests') or [])}",
            ],
        )

    id_card = data.get("provider_id_card")
    if id_card:
        _section(
            story,
            styles,
            "Provider ID card",
            [
                f"<b>Card code:</b> {_esc(id_card.get('card_code'))}",
                f"<b>Access status:</b> {_esc(id_card.get('access_status'))}",
                f"<b>Created:</b> {_esc(id_card.get('created_at'))}",
            ],
        )

    story.append(
        Paragraph(
            "This export contains personal data stored in your NAJIK account at the time of export. "
            "Contact support@najik.com if you believe anything is missing or incorrect.",
            styles["body"],
        )
    )

    doc.build(story)
    return buffer.getvalue()


def export_pdf_filename(profile: dict) -> str:
    user_id = (profile or {}).get("id") or "account"
    return f"najik-data-export-{user_id}.pdf"


class PDFRenderer(BaseRenderer):
    """Allow DRF content negotiation for PDF export endpoints."""

    media_type = "application/pdf"
    format = "pdf"
    charset = None
    render_style = "binary"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        if isinstance(data, (bytes, bytearray)):
            return bytes(data)
        if isinstance(data, str):
            return data.encode("utf-8")
        return b""
