import uuid

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.test_helpers import disable_api_throttles
from apps.staff.lockout import LOCKOUT_AFTER
from apps.staff.models import StaffUser

NO_THROTTLE = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}

PASS = "Str0ngPass!word"


@override_settings(REST_FRAMEWORK=NO_THROTTLE)
class StaffLockoutTests(TestCase):
    def setUp(self):
        disable_api_throttles()
        self.client = APIClient()
        self.email = f"lock{uuid.uuid4().hex[:8]}@example.com"
        self.staff = StaffUser.objects.create(email=self.email, full_name="Lock Test")
        self.staff.set_password(PASS)
        self.staff.save()

    def login(self, password=PASS):
        return self.client.post(
            "/api/admin/auth/login/",
            {"email": self.email, "password": password, "device_fingerprint": "test-device"},
            format="json",
        )

    def test_lockout_status_and_login_payload(self):
        for i in range(LOCKOUT_AFTER - 1):
            res = self.login("WrongPass!word1")
            self.assertEqual(res.status_code, 400, res.data)

        locked = self.login("WrongPass!word1")
        self.assertEqual(locked.status_code, 423, locked.data)
        self.assertEqual(locked.data.get("code"), "account_locked")
        self.assertIn("seconds_remaining", locked.data)
        self.assertIn("locked_until", locked.data)

        cache.clear()
        status = self.client.get("/api/admin/auth/login/lockout/", {"email": self.email})
        self.assertEqual(status.status_code, 200, status.data)
        self.assertTrue(status.data.get("locked"))
        self.assertGreater(status.data.get("seconds_remaining"), 0)

    def test_lockout_expires(self):
        self.staff.is_locked = True
        self.staff.failed_login_attempts = LOCKOUT_AFTER
        self.staff.locked_until = timezone.now() - timezone.timedelta(seconds=1)
        self.staff.save()

        status = self.client.get("/api/admin/auth/login/lockout/", {"email": self.email})
        self.assertFalse(status.data.get("locked"))

        ok = self.login()
        self.assertEqual(ok.status_code, 200, ok.data)
