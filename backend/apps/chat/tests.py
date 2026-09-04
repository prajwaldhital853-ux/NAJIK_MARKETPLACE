import base64
import tempfile
import uuid

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.test_helpers import disable_api_throttles
from apps.staff.models import StaffUser

NO_THROTTLE = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}

PASS = "Str0ngPass!word"
PIXEL_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def phone():
    return f"98{uuid.uuid4().int % 10**8:08d}"


def email(prefix="s"):
    return f"{prefix}{uuid.uuid4().hex[:10]}@example.com"


@override_settings(REST_FRAMEWORK=NO_THROTTLE, OTP_STUB=True, MEDIA_ROOT=tempfile.gettempdir())
class ChatPrivacyTests(TestCase):
    def setUp(self):
        disable_api_throttles()
        self.client = APIClient()

    def auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def staff_client(self):
        staff = StaffUser(email=email("kyc"), full_name="KYC Officer")
        staff.set_password(PASS)
        staff.save()
        client = APIClient()
        res = client.post("/api/admin/auth/login/", {"email": staff.email, "password": PASS}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return client

    def verified_provider(self):
        p = phone()
        addr = email("prov")
        res = self.client.post(
            "/api/auth/register/",
            {"full_name": "Seller One", "password": PASS, "account_type": "provider", "phone": p, "email": addr},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.auth(res.data["access"])
        self.client.post("/api/auth/otp/request/", {"purpose": "phone"}, format="json")
        self.client.post("/api/auth/otp/verify/", {"purpose": "phone", "code": "1234"}, format="json")
        apply = self.client.post(
            "/api/verification/applications/me/",
            {
                "full_name": "Seller One",
                "address": "Lahan-10, Siraha",
                "contact": p,
                "phone": p,
                "email": addr,
                "service_type": "Real Estate",
                "nagrita_uri": PIXEL_PNG,
                "nagrita_back_uri": PIXEL_PNG,
                "photo_uri": PIXEL_PNG,
            },
            format="json",
        )
        self.assertEqual(apply.status_code, 201, apply.data)
        staff = self.staff_client()
        staff.patch(f"/api/admin/verification/applications/{apply.data['id']}/", {"status": "verified"}, format="json")
        return res, p, addr, staff

    def listing_payload(self, p):
        return {
            "category": "property",
            "subcategory": "House",
            "title": "3 BHK house in Lahan",
            "description": "Bright rooms near the bazaar.",
            "price": "2500000",
            "negotiable": True,
            "location": "Lahan-3, Siraha",
            "city": "Lahan",
            "district": "Siraha",
            "contact_name": "Seller One",
            "contact_phone": p,
            "contact_via": "chat",
            "photos": [PIXEL_PNG],
            "publish": True,
            "promote": False,
        }

    def approved_listing(self):
        seller, p, _addr, staff = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.listing_payload(p), format="json")
        self.assertEqual(posted.status_code, 201, posted.data)
        staff.patch(f"/api/admin/listings/{posted.data['id']}/", {"status": "approved"}, format="json")
        return seller, posted.data["id"], staff

    def buyer(self, name="Buyer One"):
        client = APIClient()
        res = client.post(
            "/api/auth/register/",
            {"full_name": name, "password": PASS, "account_type": "user", "phone": phone()},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        client.post("/api/auth/otp/request/", {"purpose": "phone"}, format="json")
        client.post("/api/auth/otp/verify/", {"purpose": "phone", "code": "1234"}, format="json")
        return client, res.data

    def test_private_thread_report_and_block(self):
        seller_tokens, listing_id, staff = self.approved_listing()
        buyer, _ = self.buyer()
        started = buyer.post("/api/chat/threads/", {"listing_id": listing_id}, format="json")
        self.assertEqual(started.status_code, 201, started.data)
        thread_id = started.data["id"]
        self.assertNotIn("phone", started.data["other"])
        self.assertNotIn("email", started.data["other"])
        self.assertTrue(started.data["contact_phone"])

        sent = buyer.post(
            f"/api/chat/threads/{thread_id}/messages/",
            {"kind": "text", "text": "Is this still available?"},
            format="json",
        )
        self.assertEqual(sent.status_code, 201, sent.data)

        outsider, _ = self.buyer("Other Buyer")
        peek = outsider.get(f"/api/chat/threads/{thread_id}/")
        self.assertEqual(peek.status_code, 404)
        inbox = outsider.get("/api/chat/threads/")
        self.assertEqual(inbox.data, [])

        seller = APIClient()
        seller.credentials(HTTP_AUTHORIZATION=f"Bearer {seller_tokens.data['access']}")
        seller_inbox = seller.get("/api/chat/threads/")
        self.assertEqual(len(seller_inbox.data), 1)
        self.assertEqual(seller_inbox.data[0]["id"], thread_id)

        loc = buyer.post(
            f"/api/chat/threads/{thread_id}/messages/",
            {"kind": "location", "lat": 26.72, "lng": 86.49, "location_label": "Lahan bazaar"},
            format="json",
        )
        self.assertEqual(loc.status_code, 201, loc.data)

        report = buyer.post(
            f"/api/chat/threads/{thread_id}/report/",
            {"reason": "Seller asked me to pay outside NAJIK."},
            format="json",
        )
        self.assertEqual(report.status_code, 201, report.data)

        listed = staff.get("/api/admin/chat/reports/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        ticket = listed.data[0]
        self.assertEqual(ticket["reason"], "Seller asked me to pay outside NAJIK.")
        self.assertTrue(ticket["reporter"]["phone"] or ticket["reporter"]["email"])
        self.assertTrue(ticket["accused"]["phone"] or ticket["accused"]["email"])
        self.assertGreaterEqual(len(ticket["transcript"]), 2)

        blocked = buyer.post(f"/api/chat/threads/{thread_id}/block/", {}, format="json")
        self.assertEqual(blocked.status_code, 200)
        denied = seller.post(
            f"/api/chat/threads/{thread_id}/messages/",
            {"kind": "text", "text": "Hello again"},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        acted = staff.patch(
            f"/api/admin/chat/reports/{ticket['id']}/",
            {"status": "under_review", "action": "block_both", "admin_note": "Both accounts paused pending review."},
            format="json",
        )
        self.assertEqual(acted.status_code, 200, acted.data)
        self.assertFalse(acted.data["reporter_active"])
        self.assertFalse(acted.data["accused_active"])

    def test_message_notifications_group_per_thread(self):
        from apps.notifications.models import InboxNotice

        seller_tokens, listing_id, _staff = self.approved_listing()
        buyer, _ = self.buyer()
        started = buyer.post("/api/chat/threads/", {"listing_id": listing_id}, format="json")
        self.assertEqual(started.status_code, 201, started.data)
        thread_id = started.data["id"]

        seller = APIClient()
        seller.credentials(HTTP_AUTHORIZATION=f"Bearer {seller_tokens.data['access']}")

        first = buyer.post(
            f"/api/chat/threads/{thread_id}/messages/",
            {"kind": "text", "text": "Is this still available?"},
            format="json",
        )
        self.assertEqual(first.status_code, 201, first.data)
        second = buyer.post(
            f"/api/chat/threads/{thread_id}/messages/",
            {"kind": "text", "text": "Can we visit tomorrow morning?"},
            format="json",
        )
        self.assertEqual(second.status_code, 201, second.data)

        notices = InboxNotice.objects.filter(user_id=seller_tokens.data["user"]["id"], kind=InboxNotice.KIND_MESSAGE)
        self.assertEqual(notices.count(), 1)
        notice = notices.first()
        self.assertEqual(notice.body, "Can we visit tomorrow morning?")
        self.assertFalse(notice.is_read)

        inbox = seller.get("/api/notices/inbox/")
        self.assertEqual(inbox.status_code, 200, inbox.data)
        self.assertEqual(inbox.data["unread"], 1)
        message_rows = [row for row in inbox.data["items"] if row["kind"] == "message"]
        self.assertEqual(len(message_rows), 1)
        self.assertEqual(message_rows[0]["body"], "Can we visit tomorrow morning?")

    def test_voice_message_upload(self):
        seller_tokens, listing_id, _staff = self.approved_listing()
        buyer, _ = self.buyer()
        started = buyer.post("/api/chat/threads/", {"listing_id": listing_id}, format="json")
        self.assertEqual(started.status_code, 201, started.data)
        thread_id = started.data["id"]
        payload = base64.b64encode(b"\x00" * 128).decode()
        voice = f"data:audio/m4a;base64,{payload}"
        sent = buyer.post(
            f"/api/chat/threads/{thread_id}/messages/",
            {"kind": "voice", "voice": voice, "text": "Voice message"},
            format="json",
        )
        self.assertEqual(sent.status_code, 201, sent.data)
        self.assertEqual(sent.data["kind"], "voice")
        self.assertTrue(sent.data["voice_url"])
