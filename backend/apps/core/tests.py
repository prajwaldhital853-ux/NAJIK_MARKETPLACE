from django.test import TestCase
from rest_framework.test import APIClient


class HealthTests(TestCase):
    def test_health(self):
        res = APIClient().get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "ok")
