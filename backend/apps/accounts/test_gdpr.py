"""Tests for GDPR export/delete and privacy compliance settings."""
import uuid

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AppUser
from apps.accounts.tests import PASS, NO_THROTTLE
from apps.core.models import DataSubjectRequestLog, LegalDocumentConfig, PrivacyRetentionConfig
from apps.core.test_helpers import disable_api_throttles
from apps.staff.models import StaffUser


def staff_email():
    return f"staff{uuid.uuid4().hex[:8]}@example.com"


@override_settings(REST_FRAMEWORK=NO_THROTTLE)
class PrivacyComplianceTests(TestCase):
    def setUp(self):
        disable_api_throttles()
        self.client = APIClient()
        self.staff = StaffUser(email=staff_email(), full_name="Super", is_super_admin=True)
        self.staff.set_password(PASS)
        self.staff.save()

    def staff_login(self):
        res = self.client.post(
            "/api/admin/auth/login/",
            {"email": self.staff.email, "password": PASS, "device_fingerprint": "test-device"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        if res.data.get("requires_verification"):
            res = self.client.post(
                "/api/admin/auth/verify-email/",
                {
                    "staff_id": res.data["staff_id"],
                    "code": "1234",
                    "device_fingerprint": "test-device",
                },
                format="json",
            )
            self.assertEqual(res.status_code, 200, res.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_public_privacy_retention(self):
        res = self.client.get("/api/app-control/privacy-retention/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("allow_self_service_export", res.data)

    def test_public_legal_document(self):
        res = self.client.get("/api/app-control/legal/terms/?role=buyer")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], "terms")
        self.assertTrue(res.data["sections"])

    def test_staff_can_patch_legal_document(self):
        self.staff_login()
        res = self.client.patch(
            "/api/admin/app-control/legal-documents/terms/buyer/",
            {"intro": "Updated intro for tests.", "publish": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        row = LegalDocumentConfig.objects.get(doc_type="terms", role="buyer")
        self.assertEqual(row.intro, "Updated intro for tests.")
        self.assertGreaterEqual(row.version, 2)

    def test_staff_can_patch_retention_config(self):
        self.staff_login()
        res = self.client.patch(
            "/api/admin/app-control/privacy-retention/",
            {"chat_message_retention_days": 180},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        config = PrivacyRetentionConfig.get_solo()
        self.assertEqual(config.chat_message_retention_days, 180)


@override_settings(REST_FRAMEWORK=NO_THROTTLE, OTP_STUB=True, DEBUG=True)
class GdprUserTests(TestCase):
    def setUp(self):
        disable_api_throttles()
        self.client = APIClient()

    def register(self, account_type="user", **extra):
        body = {
            "full_name": "Test Person",
            "password": PASS,
            "account_type": account_type,
            "email": extra.pop("email", None) or f"u{uuid.uuid4().hex[:10]}@example.com",
            "legal_accepted": True,
            **extra,
        }
        res = self.client.post("/api/auth/register/", body, format="json")
        return res, body

    def auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def auth_from_register(self, _body, res):
        self.auth(res.data["access"])

    def test_user_can_export_data(self):
        res, body = self.register("user")
        self.auth_from_register(body, res)
        res = self.client.get("/api/auth/me/export/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF"))
        self.assertTrue(DataSubjectRequestLog.objects.filter(action="export", source="self").exists())

    def test_user_can_export_json_with_format_param(self):
        res, body = self.register("user")
        self.auth_from_register(body, res)
        res = self.client.get("/api/auth/me/export/?format=json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["profile"]["email"], body["email"])

    def test_user_can_delete_account(self):
        res, body = self.register("user")
        self.auth_from_register(body, res)
        user_id = AppUser.objects.get(email=body["email"]).id
        res = self.client.post(
            "/api/auth/me/delete/",
            {"confirm": "DELETE", "password": PASS},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertFalse(AppUser.objects.filter(id=user_id).exists())
        self.assertTrue(DataSubjectRequestLog.objects.filter(action="delete", source="self").exists())

    def test_export_disabled_by_config(self):
        config = PrivacyRetentionConfig.get_solo()
        config.allow_self_service_export = False
        config.save(update_fields=["allow_self_service_export"])
        res, body = self.register("user")
        self.auth_from_register(body, res)
        blocked = self.client.get("/api/auth/me/export/")
        self.assertEqual(blocked.status_code, 403)
