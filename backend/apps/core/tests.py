from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AppUser
from apps.staff.models import StaffUser


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
        "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    }
)
class AuthSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_login_and_me(self):
        res = self.client.post(
            "/api/auth/register/",
            {
                "email": "buyer@example.com",
                "full_name": "Test Buyer",
                "password": "Str0ngPass!word",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        access = res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "buyer@example.com")
        user = AppUser.objects.get(email="buyer@example.com")
        self.assertTrue(user.password.startswith("argon2"))

    def test_login_does_not_reveal_missing_user(self):
        missing = self.client.post(
            "/api/auth/login/",
            {"identifier": "nobody@example.com", "password": "Str0ngPass!word"},
            format="json",
        )
        user = AppUser.objects.create_user(
            email="buyer@example.com",
            password="Str0ngPass!word",
        )
        wrong = self.client.post(
            "/api/auth/login/",
            {"identifier": user.email, "password": "WrongPass!word1"},
            format="json",
        )
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(missing.data["non_field_errors"][0], wrong.data["non_field_errors"][0])

    def test_app_token_cannot_access_staff_me(self):
        res = self.client.post(
            "/api/auth/register/",
            {"email": "buyer@example.com", "password": "Str0ngPass!word"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        staff_me = self.client.get("/api/admin/auth/me/")
        self.assertEqual(staff_me.status_code, 401)

    def test_staff_token_cannot_access_app_me(self):
        staff = StaffUser(email="owner@najik.local", full_name="Owner")
        staff.set_password("Str0ngPass!word")
        staff.save()
        res = self.client.post(
            "/api/admin/auth/login/",
            {"email": "owner@najik.local", "password": "Str0ngPass!word"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        app_me = self.client.get("/api/auth/me/")
        self.assertEqual(app_me.status_code, 401)
        staff_me = self.client.get("/api/admin/auth/me/")
        self.assertEqual(staff_me.status_code, 200)

    def test_health(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "ok")
