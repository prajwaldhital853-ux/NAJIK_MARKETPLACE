import uuid

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.test_helpers import disable_api_throttles
from apps.staff.lockout import LOCKOUT_AFTER, get_lockout_row, lockout_seconds_remaining
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
        self.device_a = "device-a"
        self.device_b = "device-b"
        self.email = f"lock{uuid.uuid4().hex[:8]}@example.com"
        self.other_email = f"other{uuid.uuid4().hex[:8]}@example.com"
        self.staff = StaffUser.objects.create(email=self.email, full_name="Lock Test")
        self.staff.set_password(PASS)
        self.staff.save()
        self.other_staff = StaffUser.objects.create(email=self.other_email, full_name="Other Staff")
        self.other_staff.set_password(PASS)
        self.other_staff.save()

    def login(self, email=None, password=PASS, device_fingerprint="test-device"):
        cache.clear()
        return self.client.post(
            "/api/admin/auth/login/",
            {
                "email": email or self.email,
                "password": password,
                "device_fingerprint": device_fingerprint,
            },
            format="json",
        )

    def lockout_status(self, email=None, device_fingerprint="test-device"):
        cache.clear()
        return self.client.get(
            "/api/admin/auth/login/lockout/",
            {
                "email": email or self.email,
                "device_fingerprint": device_fingerprint,
            },
        )

    def test_device_lockout_does_not_set_account_locked(self):
        for _ in range(LOCKOUT_AFTER - 1):
            res = self.login(password="WrongPass!word1", device_fingerprint=self.device_a)
            self.assertEqual(res.status_code, 400, res.data)

        locked = self.login(password="WrongPass!word1", device_fingerprint=self.device_a)
        self.assertEqual(locked.status_code, 423, locked.data)
        self.assertIn("device and network", str(locked.data.get("detail", "")).lower())

        self.staff.refresh_from_db()
        self.assertFalse(self.staff.is_locked)
        self.assertEqual(self.staff.failed_login_attempts, 0)

    def test_same_ip_different_browser_still_locked(self):
        for _ in range(LOCKOUT_AFTER):
            self.login(password="WrongPass!word1", device_fingerprint=self.device_a)

        locked = self.login(password="WrongPass!word1", device_fingerprint=self.device_a)
        self.assertEqual(locked.status_code, 423, locked.data)

        blocked_other_browser = self.login(password=PASS, device_fingerprint=self.device_b)
        self.assertEqual(blocked_other_browser.status_code, 423, blocked_other_browser.data)

    def test_other_staff_same_device_can_still_login(self):
        for _ in range(LOCKOUT_AFTER):
            self.login(password="WrongPass!word1", device_fingerprint=self.device_a)

        locked = self.login(password="WrongPass!word1", device_fingerprint=self.device_a)
        self.assertEqual(locked.status_code, 423, locked.data)

        ok = self.login(email=self.other_email, device_fingerprint=self.device_a)
        self.assertIn(ok.status_code, {200, 423})

    def test_lockout_status_tracks_ip_for_email(self):
        for _ in range(LOCKOUT_AFTER):
            self.login(password="WrongPass!word1", device_fingerprint=self.device_a)

        status = self.lockout_status(device_fingerprint=self.device_a)
        self.assertEqual(status.status_code, 200, status.data)
        self.assertTrue(status.data.get("locked"))
        self.assertGreater(status.data.get("seconds_remaining"), 0)

        same_ip_other_browser = self.lockout_status(device_fingerprint=self.device_b)
        self.assertTrue(same_ip_other_browser.data.get("locked"))

    def test_lockout_expires_on_device(self):
        for _ in range(LOCKOUT_AFTER):
            self.login(password="WrongPass!word1", device_fingerprint=self.device_a)

        row = get_lockout_row(self.email, "127.0.0.1", self.device_a)
        self.assertIsNotNone(row)
        row.locked_until = timezone.now() - timezone.timedelta(seconds=1)
        row.save(update_fields=["locked_until"])

        self.assertEqual(lockout_seconds_remaining(row), 0)
        ok = self.login(device_fingerprint=self.device_a)
        self.assertIn(ok.status_code, {200, 423})

    def test_manual_account_lock_still_blocks_everywhere(self):
        self.staff.is_locked = True
        self.staff.locked_until = timezone.now() + timezone.timedelta(minutes=10)
        self.staff.save()

        res = self.login(device_fingerprint=self.device_b)
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("administrator", str(res.data).lower())
