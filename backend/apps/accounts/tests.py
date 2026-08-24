import uuid
from datetime import timedelta
import tempfile

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.lockout import LOCKOUT_AFTER
from apps.accounts.models import AppUser, LoginLockout
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
NEW_PASS = "An0therStr0ng!pw"
PIXEL_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def phone():
    return f"98{uuid.uuid4().int % 10**8:08d}"


def email(prefix="u"):
    return f"{prefix}{uuid.uuid4().hex[:10]}@example.com"


def user_rows(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    return []


@override_settings(REST_FRAMEWORK=NO_THROTTLE, OTP_STUB=True, DEBUG=True, MEDIA_ROOT=tempfile.gettempdir())
class AuthFlowTests(TestCase):
    def setUp(self):
        disable_api_throttles()
        self.client = APIClient()

    def register(self, account_type="user", **extra):
        body = {
            "full_name": "Test Person",
            "password": PASS,
            "account_type": account_type,
            "email": extra.pop("email", None) or email(account_type[0]),
            **extra,
        }
        if "phone" in extra and extra["phone"] is None:
            body.pop("phone", None)
        res = self.client.post("/api/auth/register/", body, format="json")
        return res, body

    def auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_buyer_register_login_me(self):
        res, body = self.register("user")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["user"]["account_type"], "user")
        self.assertEqual(res.data["user"]["verification_status"], "none")
        self.assertIsNone(res.data["user"]["application_id"])
        self.assertFalse(res.data["user"]["phone_verified"])
        self.assertFalse(res.data["user"]["email_verified"])
        user = AppUser.objects.get(email=body["email"])
        self.assertTrue(user.password.startswith("argon2"))

        self.client.credentials()
        login = self.client.post(
            "/api/auth/login/",
            {"identifier": body["email"], "password": PASS},
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)
        self.auth(login.data["access"])
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], body["email"])
        self.assertEqual(me.data["account_type"], "user")

    def test_provider_register_with_phone(self):
        p = phone()
        res, _ = self.register("provider", phone=p, email=None)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["user"]["account_type"], "provider")
        self.assertEqual(res.data["user"]["phone"], p)
        self.assertFalse(res.data["user"]["phone_verified"])

        login = self.client.post(
            "/api/auth/login/",
            {"identifier": f"+977{p}", "password": PASS},
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)

    def test_register_requires_email_or_phone(self):
        res = self.client.post(
            "/api/auth/register/",
            {"full_name": "X", "password": PASS, "account_type": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_register_requires_account_type(self):
        res = self.client.post(
            "/api/auth/register/",
            {"email": email(), "password": PASS},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_register_rejects_weak_password(self):
        res = self.client.post(
            "/api/auth/register/",
            {"email": email(), "password": "password", "account_type": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_register_rejects_invalid_phone(self):
        res = self.client.post(
            "/api/auth/register/",
            {"phone": "12345", "password": PASS, "account_type": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_one_identity_cannot_be_buyer_and_provider(self):
        addr = email("same")
        first, _ = self.register("user", email=addr)
        self.assertEqual(first.status_code, 201, first.data)
        second = self.client.post(
            "/api/auth/register/",
            {"email": addr, "password": PASS, "account_type": "provider", "full_name": "Other"},
            format="json",
        )
        self.assertEqual(second.status_code, 400)
        self.assertIn("already registered as a buyer", str(second.data).lower())
        self.assertIn("cannot be used for both", str(second.data).lower())

    def test_duplicate_phone_is_unique_across_roles(self):
        p = phone()
        first, _ = self.register("provider", phone=p, email=email("p"))
        self.assertEqual(first.status_code, 201, first.data)
        second = self.client.post(
            "/api/auth/register/",
            {"phone": p, "email": email("b"), "password": PASS, "account_type": "user"},
            format="json",
        )
        self.assertEqual(second.status_code, 400)
        self.assertIn("already registered as a service provider", str(second.data).lower())
        self.assertIn("phone", str(second.data).lower())

    def test_login_does_not_reveal_missing_user(self):
        missing = self.client.post(
            "/api/auth/login/",
            {"identifier": email("nobody"), "password": PASS},
            format="json",
        )
        res, body = self.register("user")
        self.assertEqual(res.status_code, 201, res.data)
        self.client.credentials()
        wrong = self.client.post(
            "/api/auth/login/",
            {"identifier": body["email"], "password": "WrongPass!word1"},
            format="json",
        )
        self.assertEqual(missing.status_code, 401)
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(missing.data["detail"], wrong.data["detail"])
        self.assertEqual(missing.data["detail"], "Invalid credentials.")

    def test_inactive_user_cannot_login(self):
        res, body = self.register("user")
        AppUser.objects.filter(email=body["email"]).update(is_active=False)
        login = self.client.post(
            "/api/auth/login/",
            {"identifier": body["email"], "password": PASS},
            format="json",
        )
        self.assertEqual(login.status_code, 401)
        self.assertIn("blocked", str(login.data["detail"]).lower())

    def test_four_failed_logins_lock_for_ten_minutes(self):
        res, body = self.register("user")
        ident = body["email"]
        self.client.credentials()
        for i in range(LOCKOUT_AFTER - 1):
            fail = self.client.post(
                "/api/auth/login/",
                {"identifier": ident, "password": "WrongPass!word1"},
                format="json",
            )
            self.assertEqual(fail.status_code, 401, f"attempt {i + 1}: {fail.data}")
        locked = self.client.post(
            "/api/auth/login/",
            {"identifier": ident, "password": "WrongPass!word1"},
            format="json",
        )
        self.assertEqual(locked.status_code, 429, locked.data)
        self.assertIn("retry_after", locked.data)
        self.assertGreater(locked.data["retry_after"], 0)
        still = self.client.post(
            "/api/auth/login/",
            {"identifier": ident, "password": PASS},
            format="json",
        )
        self.assertEqual(still.status_code, 429)
        row = LoginLockout.objects.get(identifier=ident.lower())
        row.locked_until = timezone.now() - timedelta(seconds=1)
        row.save(update_fields=["locked_until"])
        ok = self.client.post(
            "/api/auth/login/",
            {"identifier": ident, "password": PASS},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.data)

    def test_lockout_does_not_block_new_identity_signup(self):
        ghost = email("ghost")
        for _ in range(LOCKOUT_AFTER):
            self.client.post(
                "/api/auth/login/",
                {"identifier": ghost, "password": "WrongPass!word1"},
                format="json",
            )
        locked = self.client.post(
            "/api/auth/login/",
            {"identifier": ghost, "password": "WrongPass!word1"},
            format="json",
        )
        self.assertEqual(locked.status_code, 429)
        created, _ = self.register("user", email=ghost)
        self.assertEqual(created.status_code, 201, created.data)

    def test_refresh_rotates_and_blacklists_old_token(self):
        res, _ = self.register("user")
        refresh = res.data["refresh"]
        rotated = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(rotated.status_code, 200, rotated.data)
        self.assertNotEqual(rotated.data["refresh"], refresh)
        replay = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(replay.status_code, 401)

    def test_logout_blacklists_refresh(self):
        res, _ = self.register("user")
        self.auth(res.data["access"])
        out = self.client.post("/api/auth/logout/", {"refresh": res.data["refresh"]}, format="json")
        self.assertEqual(out.status_code, 204)
        replay = self.client.post("/api/auth/refresh/", {"refresh": res.data["refresh"]}, format="json")
        self.assertEqual(replay.status_code, 401)

    def test_me_requires_app_token(self):
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 401)

    def test_app_token_cannot_access_staff_me(self):
        res, _ = self.register("user")
        self.auth(res.data["access"])
        self.assertEqual(self.client.get("/api/admin/auth/me/").status_code, 401)

    def test_staff_token_cannot_access_app_me(self):
        staff = StaffUser(email=email("owner"), full_name="Owner", is_super_admin=True)
        staff.set_password(PASS)
        staff.save()
        res = self.client.post(
            "/api/admin/auth/login/",
            {"email": staff.email, "password": PASS},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.auth(res.data["access"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/auth/me/").status_code, 200)

    def test_staff_refresh_cannot_be_used_as_app_refresh(self):
        staff = StaffUser(email=email("ops"), full_name="Ops")
        staff.set_password(PASS)
        staff.save()
        res = self.client.post(
            "/api/admin/auth/login/",
            {"email": staff.email, "password": PASS},
            format="json",
        )
        bad = self.client.post("/api/auth/refresh/", {"refresh": res.data["refresh"]}, format="json")
        self.assertEqual(bad.status_code, 401)

    def test_otp_requires_auth(self):
        res = self.client.post("/api/auth/otp/request/", {"purpose": "phone"}, format="json")
        self.assertEqual(res.status_code, 401)

    def test_provider_otp_1234_verifies_phone(self):
        p = phone()
        res, _ = self.register("provider", phone=p, email=email("otp"))
        self.auth(res.data["access"])
        sent = self.client.post("/api/auth/otp/request/", {"purpose": "phone"}, format="json")
        self.assertEqual(sent.status_code, 200, sent.data)
        wrong = self.client.post(
            "/api/auth/otp/verify/",
            {"purpose": "phone", "code": "0000"},
            format="json",
        )
        self.assertEqual(wrong.status_code, 400)
        ok = self.client.post(
            "/api/auth/otp/verify/",
            {"purpose": "phone", "code": "1234"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertTrue(ok.data["phone_verified"])
        me = self.client.get("/api/auth/me/")
        self.assertTrue(me.data["phone_verified"])

    def test_email_otp_stub(self):
        res, body = self.register("provider")
        self.auth(res.data["access"])
        sent = self.client.post("/api/auth/otp/request/", {"purpose": "email"}, format="json")
        self.assertEqual(sent.status_code, 200, sent.data)
        ok = self.client.post(
            "/api/auth/otp/verify/",
            {"purpose": "email", "code": "1234"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertTrue(ok.data["email_verified"])

    def test_otp_max_attempts_then_reject(self):
        p = phone()
        res, _ = self.register("provider", phone=p)
        self.auth(res.data["access"])
        self.client.post("/api/auth/otp/request/", {"purpose": "phone"}, format="json")
        for _ in range(5):
            self.client.post(
                "/api/auth/otp/verify/",
                {"purpose": "phone", "code": "0000"},
                format="json",
            )
        last = self.client.post(
            "/api/auth/otp/verify/",
            {"purpose": "phone", "code": "1234"},
            format="json",
        )
        self.assertEqual(last.status_code, 400)
        self.assertFalse(AppUser.objects.get(phone=p).phone_verified)

    def test_password_reset_does_not_reveal_missing_account(self):
        missing = self.client.post(
            "/api/auth/password-reset/",
            {"identifier": email("missing")},
            format="json",
        )
        self.assertEqual(missing.status_code, 200)
        self.assertNotIn("dev_reset", missing.data)
        res, body = self.register("user")
        found = self.client.post(
            "/api/auth/password-reset/",
            {"identifier": body["email"]},
            format="json",
        )
        self.assertEqual(found.status_code, 200)
        self.assertEqual(found.data["detail"], missing.data["detail"])
        self.assertIn("dev_reset", found.data)
        confirm = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": found.data["dev_reset"]["uid"],
                "token": found.data["dev_reset"]["token"],
                "password": NEW_PASS,
            },
            format="json",
        )
        self.assertEqual(confirm.status_code, 200, confirm.data)
        old = self.client.post(
            "/api/auth/login/",
            {"identifier": body["email"], "password": PASS},
            format="json",
        )
        self.assertEqual(old.status_code, 401)
        new = self.client.post(
            "/api/auth/login/",
            {"identifier": body["email"], "password": NEW_PASS},
            format="json",
        )
        self.assertEqual(new.status_code, 200, new.data)

    def test_password_reset_bad_token(self):
        res, _ = self.register("user")
        bad = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": res.data["user"]["id"], "token": "not-a-real-token", "password": NEW_PASS},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

    def test_google_missing_token(self):
        res = self.client.post("/api/auth/google/", {"account_type": "user"}, format="json")
        self.assertEqual(res.status_code, 400)

    @override_settings(GOOGLE_CLIENT_IDS=["test-client"], GOOGLE_CLIENT_SECRET="secret")
    def test_google_code_exchange_signs_in_buyer(self):
        from unittest.mock import patch

        with patch(
            "apps.accounts.views.google._exchange_google_code",
            return_value=(
                {
                    "sub": "google-code-1",
                    "email": "code.google@example.com",
                    "email_verified": True,
                    "name": "Code User",
                },
                None,
            ),
        ):
            res = self.client.post(
                "/api/auth/google/",
                {"code": "4/abc", "redirect_uri": "https://auth.expo.io/@prajwal851/najik", "account_type": "user"},
                format="json",
            )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["user"]["needs_profile"])

    def test_google_unconfigured_is_unavailable(self):
        res = self.client.post(
            "/api/auth/google/",
            {"id_token": "fake", "account_type": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 503)

    @override_settings(GOOGLE_CLIENT_IDS=["test-client"])
    def test_google_buyer_skips_otp_and_needs_profile(self):
        from unittest.mock import patch

        with patch("apps.accounts.views.google._google_payload", return_value=(
            {
                "sub": "google-buyer-1",
                "email": "buyer.google@example.com",
                "email_verified": True,
                "name": "Google Name",
            },
            None,
        )):
            res = self.client.post(
                "/api/auth/google/",
                {"id_token": "tok", "account_type": "user"},
                format="json",
            )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["user"]["email_verified"])
        self.assertTrue(res.data["user"]["needs_profile"])
        self.auth(res.data["access"])
        p = phone()
        patched = self.client.patch(
            "/api/auth/me/",
            {"full_name": "Buyer Name", "phone": p, "address": "Lahan, Siraha"},
            format="json",
        )
        self.assertEqual(patched.status_code, 200, patched.data)
        self.assertFalse(patched.data["needs_profile"])
        self.assertEqual(patched.data["full_name"], "Buyer Name")
        self.assertEqual(patched.data["phone"], p)

    @override_settings(GOOGLE_CLIENT_IDS=["test-client"])
    def test_google_provider_cannot_use_buyer_page(self):
        from unittest.mock import patch

        res, body = self.register("provider", phone=phone(), email=email("provg"))
        user = AppUser.objects.get(email=body["email"])
        user.google_sub = "google-seller-1"
        user.save(update_fields=["google_sub"])
        with patch("apps.accounts.views.google._google_payload", return_value=(
            {
                "sub": "google-seller-1",
                "email": body["email"],
                "email_verified": True,
                "name": "Seller",
            },
            None,
        )):
            blocked = self.client.post(
                "/api/auth/google/",
                {"id_token": "tok", "account_type": "user"},
                format="json",
            )
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(blocked.data["code"], "use_provider_login")

    def test_provider_cannot_login_as_buyer_role(self):
        p = phone()
        self.register("provider", phone=p, email=email("role"))
        res = self.client.post(
            "/api/auth/login/",
            {"identifier": p, "password": PASS, "account_type": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data["code"], "use_provider_login")

    def test_staff_can_list_live_app_users(self):
        res, body = self.register("provider", phone=phone(), email=email("live"))
        self.assertEqual(res.status_code, 201, res.data)
        staff = StaffUser(email=email("dir"), full_name="Directory")
        staff.set_password(PASS)
        staff.save()
        login = self.client.post(
            "/api/admin/auth/login/",
            {"email": staff.email, "password": PASS},
            format="json",
        )
        self.auth(login.data["access"])
        listed = self.client.get("/api/admin/users/")
        self.assertEqual(listed.status_code, 200, listed.data)
        emails = [row["email"] for row in user_rows(listed.data)]
        self.assertIn(body["email"], emails)
        row = next(item for item in user_rows(listed.data) if item["email"] == body["email"])
        self.assertEqual(row["account_type"], "provider")
        self.assertIn("date_joined", row)

    def test_staff_can_search_app_users(self):
        target_email = email("findme")
        other_email = email("other")
        self.register("user", phone=phone(), email=target_email)
        self.register("user", phone=phone(), email=other_email)
        staff = StaffUser(email=email("search"), full_name="Search Staff")
        staff.set_password(PASS)
        staff.save()
        login = self.client.post(
            "/api/admin/auth/login/",
            {"email": staff.email, "password": PASS},
            format="json",
        )
        self.auth(login.data["access"])
        listed = self.client.get("/api/admin/users/", {"q": "findme"})
        self.assertEqual(listed.status_code, 200, listed.data)
        emails = [row["email"] for row in user_rows(listed.data)]
        self.assertIn(target_email, emails)
        self.assertNotIn(other_email, emails)

    def test_staff_can_delete_app_user(self):
        res, body = self.register("user", phone=phone(), email=email("del"))
        self.assertEqual(res.status_code, 201, res.data)
        user_id = res.data["user"]["id"]
        staff = StaffUser(email=email("wipe"), full_name="Directory")
        staff.set_password(PASS)
        staff.save()
        login = self.client.post(
            "/api/admin/auth/login/",
            {"email": staff.email, "password": PASS},
            format="json",
        )
        self.auth(login.data["access"])
        deleted = self.client.delete(f"/api/admin/users/{user_id}/")
        self.assertEqual(deleted.status_code, 204)
        listed = self.client.get("/api/admin/users/")
        self.assertEqual(listed.status_code, 200)
        emails = [row["email"] for row in user_rows(listed.data)]
        self.assertNotIn(body["email"], emails)

    def test_staff_can_block_and_activate_app_user(self):
        res, body = self.register("user", phone=phone(), email=email("blk"))
        self.assertEqual(res.status_code, 201, res.data)
        user_id = res.data["user"]["id"]
        staff = StaffUser(email=email("mod"), full_name="Moderator")
        staff.set_password(PASS)
        staff.save()
        login = self.client.post(
            "/api/admin/auth/login/",
            {"email": staff.email, "password": PASS},
            format="json",
        )
        self.auth(login.data["access"])
        blocked = self.client.patch(f"/api/admin/users/{user_id}/", {"status": "blocked"}, format="json")
        self.assertEqual(blocked.status_code, 200, blocked.data)
        self.assertFalse(blocked.data["is_active"])
        self.auth(res.data["access"])
        kicked = self.client.get("/api/auth/me/")
        self.assertEqual(kicked.status_code, 401)
        self.assertIn("blocked", str(kicked.data["detail"]).lower())
        self.auth(login.data["access"])
        active = self.client.patch(f"/api/admin/users/{user_id}/", {"status": "active"}, format="json")
        self.assertEqual(active.status_code, 200, active.data)
        self.assertTrue(active.data["is_active"])
        off = self.client.patch(f"/api/admin/users/{user_id}/", {"status": "deactivated"}, format="json")
        self.assertEqual(off.status_code, 200, off.data)
        self.assertFalse(off.data["is_active"])
        self.auth(res.data["access"])
        kicked_off = self.client.get("/api/auth/me/")
        self.assertEqual(kicked_off.status_code, 401)
        self.assertIn("deactivat", str(kicked_off.data["detail"]).lower())

    def test_owner_data_is_isolated_on_me(self):
        a, body_a = self.register("user")
        b, body_b = self.register("user")
        self.auth(a.data["access"])
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.data["email"], body_a["email"])
        self.assertNotEqual(me.data["email"], body_b["email"])
        self.assertEqual(str(me.data["id"]), str(a.data["user"]["id"]))

    def test_buyer_can_set_avatar(self):
        res, _ = self.register("user")
        self.auth(res.data["access"])
        patched = self.client.patch("/api/auth/me/", {"photo_uri": PIXEL_PNG}, format="json")
        self.assertEqual(patched.status_code, 200, patched.data)
        self.assertIn("/api/auth/me/photo/", patched.data["photo_uri"])
        photo = self.client.get("/api/auth/me/photo/")
        self.assertEqual(photo.status_code, 200)

    def test_provider_cannot_set_avatar_on_me(self):
        res, _ = self.register("provider")
        self.auth(res.data["access"])
        patched = self.client.patch("/api/auth/me/", {"photo_uri": PIXEL_PNG}, format="json")
        self.assertEqual(patched.status_code, 400)
