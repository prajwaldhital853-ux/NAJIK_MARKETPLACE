import tempfile
import uuid

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.test_helpers import disable_api_throttles
from apps.staff.models import StaffUser
from apps.verification.models import ProviderApplication

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
class SellerKycTests(TestCase):
    def setUp(self):
        disable_api_throttles()
        self.client = APIClient()

    def auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def register_provider(self, verified=False):
        p = phone()
        addr = email("prov")
        res = self.client.post(
            "/api/auth/register/",
            {
                "full_name": "Seller One",
                "password": PASS,
                "account_type": "provider",
                "phone": p,
                "email": addr,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.auth(res.data["access"])
        if verified:
            self.client.post("/api/auth/otp/request/", {"purpose": "phone"}, format="json")
            otp = self.client.post(
                "/api/auth/otp/verify/",
                {"purpose": "phone", "code": "1234"},
                format="json",
            )
            self.assertEqual(otp.status_code, 200, otp.data)
        return res, p, addr

    def apply_payload(self, p, addr):
        return {
            "full_name": "Seller One",
            "address": "Lahan-10, Siraha",
            "contact": p,
            "phone": p,
            "email": addr,
            "service_type": "Real Estate",
            "nagrita_uri": PIXEL_PNG,
            "nagrita_back_uri": PIXEL_PNG,
            "photo_uri": PIXEL_PNG,
            "nation_card_uri": PIXEL_PNG,
        }

    def staff_client(self):
        staff = StaffUser(email=email("kyc"), full_name="KYC Officer")
        staff.set_password(PASS)
        staff.save()
        client = APIClient()
        res = client.post(
            "/api/admin/auth/login/",
            {"email": staff.email, "password": PASS},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return client

    def test_buyer_cannot_submit_kyc(self):
        res = self.client.post(
            "/api/auth/register/",
            {"email": email("buy"), "password": PASS, "account_type": "user", "full_name": "Buyer"},
            format="json",
        )
        self.auth(res.data["access"])
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(phone(), email("x")),
            format="json",
        )
        self.assertEqual(apply.status_code, 403)

    def test_provider_must_verify_contact_before_apply(self):
        self.register_provider(verified=False)
        pending = self.client.get("/api/verification/applications/me/")
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(pending.data["status"], "none")
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(phone(), email("x")),
            format="json",
        )
        self.assertEqual(apply.status_code, 400)
        self.assertIn("Verify", apply.data["detail"])

    def test_provider_apply_then_staff_verify(self):
        res, p, addr = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        self.assertEqual(apply.status_code, 201, apply.data)
        self.assertEqual(apply.data["status"], "pending")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["verification_status"], "pending")
        self.assertIsNotNone(me.data["application_id"])

        again = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        self.assertEqual(again.status_code, 400)

        staff = self.staff_client()
        listed = staff.get("/api/admin/verification/applications/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data.get("results", listed.data)), 1)
        row = (listed.data.get("results") or listed.data)[0]
        self.assertEqual(row["status"], "pending")
        self.assertEqual(row["full_name"], "Seller One")
        self.assertEqual(row["address"], "Lahan-10, Siraha")
        self.assertEqual(row["phone"], p)
        self.assertEqual(row["email"], addr)
        self.assertEqual(row["service_type"], "Real Estate")
        self.assertTrue(row["created_at"])
        self.assertTrue(row["phone_verified"])
        self.assertIn("/file/nagrita/", row["nagrita_uri"])
        self.assertIn("/file/nagrita_back/", row["nagrita_back_uri"])
        self.assertIn("/file/photo/", row["photo_uri"])
        app_id = row["id"]
        patched = staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "verified"},
            format="json",
        )
        self.assertEqual(patched.status_code, 200, patched.data)
        self.assertEqual(patched.data["status"], "verified")
        self.assertTrue(patched.data["reviewed_at"])
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["verification_status"], "verified")
        self.assertEqual(ProviderApplication.objects.get(pk=app_id).status, "verified")

    def test_staff_reject(self):
        res, p, addr = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        staff = self.staff_client()
        app_id = apply.data["id"]
        patched = staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "rejected", "rejection_note": "Documents unclear"},
            format="json",
        )
        self.assertEqual(patched.status_code, 200)
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["verification_status"], "rejected")
        self.assertEqual(me.data["rejection_note"], "Documents unclear")

    def test_staff_can_reject_verified_kyc_with_note(self):
        res, p, addr = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        staff = self.staff_client()
        app_id = apply.data["id"]
        staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "verified"},
            format="json",
        )
        denied = staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "rejected"},
            format="json",
        )
        self.assertEqual(denied.status_code, 400)
        revoked = staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "rejected", "rejection_note": "Please upload clearer nation card"},
            format="json",
        )
        self.assertEqual(revoked.status_code, 200, revoked.data)
        self.assertEqual(revoked.data["status"], "rejected")
        self.assertEqual(revoked.data["rejection_note"], "Please upload clearer nation card")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["verification_status"], "rejected")
        self.assertEqual(me.data["rejection_note"], "Please upload clearer nation card")

    def test_staff_can_reactivate_rejected(self):
        res, p, addr = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        staff = self.staff_client()
        app_id = apply.data["id"]
        staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "rejected", "rejection_note": "Blurry docs"},
            format="json",
        )
        reopen = staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "pending"},
            format="json",
        )
        self.assertEqual(reopen.status_code, 200, reopen.data)
        self.assertEqual(reopen.data["status"], "pending")
        self.assertEqual(reopen.data.get("rejection_note") or "", "")

    def test_staff_cannot_reopen_verified_to_pending(self):
        res, p, addr = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        staff = self.staff_client()
        app_id = apply.data["id"]
        staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "verified"},
            format="json",
        )
        reopen = staff.patch(
            f"/api/admin/verification/applications/{app_id}/",
            {"status": "pending"},
            format="json",
        )
        self.assertEqual(reopen.status_code, 400)

    def test_application_files_require_staff_token(self):
        res, p, addr = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        app_id = apply.data["id"]
        anon = APIClient()
        denied = anon.get(f"/api/admin/verification/applications/{app_id}/file/photo/")
        self.assertIn(denied.status_code, (401, 403))
        self.auth(res.data["access"])
        as_app = self.client.get(f"/api/admin/verification/applications/{app_id}/file/photo/")
        self.assertEqual(as_app.status_code, 401)
        staff = self.staff_client()
        photo = staff.get(f"/api/admin/verification/applications/{app_id}/file/photo/")
        self.assertEqual(photo.status_code, 200)
        nagrita = staff.get(f"/api/admin/verification/applications/{app_id}/file/nagrita/")
        self.assertEqual(nagrita.status_code, 200)
        back = staff.get(f"/api/admin/verification/applications/{app_id}/file/nagrita_back/")
        self.assertEqual(back.status_code, 200)
        mine = self.client.get("/api/verification/applications/me/file/photo/")
        self.assertEqual(mine.status_code, 200)
        me = self.client.get("/api/auth/me/")
        self.assertIn("/applications/me/file/photo/", me.data["photo_uri"])

    def test_providers_cannot_see_each_others_applications(self):
        first, p1, e1 = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p1, e1),
            format="json",
        )
        self.assertEqual(apply.status_code, 201, apply.data)
        first_id = apply.data["id"]
        second, _, _ = self.register_provider(verified=True)
        other = self.client.get("/api/verification/applications/me/")
        self.assertEqual(other.data.get("status"), "none")
        self.assertNotEqual(other.data.get("id"), first_id)
        me = self.client.get("/api/auth/me/")
        self.assertIsNone(me.data["application_id"])

    def test_invalid_image_rejected(self):
        self.register_provider(verified=True)
        payload = self.apply_payload(phone(), email("bad"))
        payload["nagrita_uri"] = "data:image/gif;base64,AAAA"
        payload["photo_uri"] = PIXEL_PNG
        apply = self.client.post("/api/verification/applications/me/", payload, format="json")
        self.assertEqual(apply.status_code, 400)

    def test_app_token_cannot_list_staff_queue(self):
        self.register_provider(verified=True)
        listed = self.client.get("/api/admin/verification/applications/")
        self.assertEqual(listed.status_code, 401)

    def test_verified_seller_profile_edit_waits_for_staff(self):
        res, p, addr = self.register_provider(verified=True)
        apply = self.client.post(
            "/api/verification/applications/me/",
            self.apply_payload(p, addr),
            format="json",
        )
        self.assertEqual(apply.status_code, 201, apply.data)
        staff = self.staff_client()
        staff.patch(
            f"/api/admin/verification/applications/{apply.data['id']}/",
            {"status": "verified"},
            format="json",
        )
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["verification_status"], "verified")
        edit = self.client.patch(
            "/api/verification/applications/me/",
            {"full_name": "New Seller Name", "address": "Kathmandu-1"},
            format="json",
        )
        self.assertEqual(edit.status_code, 200, edit.data)
        self.assertTrue(edit.data["has_pending_edit"])
        self.assertEqual(edit.data["full_name"], "Seller One")
        self.assertEqual(edit.data["pending_edit"]["full_name"], "New Seller Name")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["full_name"], "Seller One")
        self.assertTrue(me.data["has_pending_edit"])
        staff.patch(
            f"/api/admin/verification/applications/{apply.data['id']}/",
            {"status": "verified"},
            format="json",
        )
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["full_name"], "New Seller Name")
        self.assertFalse(me.data["has_pending_edit"])
