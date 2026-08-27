import uuid

from django.test import TestCase, override_settings

from apps.core.system_status import build_platform_status_checks
from apps.staff.models import Role, StaffUser


@override_settings(DEBUG=True, OTP_STUB=True)
class PlatformStatusTests(TestCase):
    def test_builds_infrastructure_checks_without_pending_queues(self):
        labels = [item["label"] for item in build_platform_status_checks()]
        self.assertIn("API / Database", labels)
        self.assertIn("RBAC permission matrix", labels)
        self.assertNotIn("Seller KYC / verification", labels)
        self.assertNotIn("Listings feed", labels)
        self.assertNotIn("Reports & trust", labels)

    def test_staff_without_role_marks_attention(self):
        StaffUser.objects.create(
            email=f"norole{uuid.uuid4().hex[:6]}@example.com",
            password="x",
            is_active=True,
            role=None,
        )
        staff_check = next(item for item in build_platform_status_checks() if item["label"] == "Staff roles & access")
        self.assertIn(staff_check["status"], {"attention", "problem"})
