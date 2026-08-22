import tempfile
import uuid

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.test_helpers import disable_api_throttles
from apps.core.models import SellerPaymentConfig
from apps.listings.models import Listing
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
class ListingModerationTests(TestCase):
    def setUp(self):
        disable_api_throttles()
        self.client = APIClient()

    def auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

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
                "nation_card_uri": PIXEL_PNG,
                "photo_uri": PIXEL_PNG,
            },
            format="json",
        )
        self.assertEqual(apply.status_code, 201, apply.data)
        staff = self.staff_client()
        staff.patch(f"/api/admin/verification/applications/{apply.data['id']}/", {"status": "verified"}, format="json")
        cfg = SellerPaymentConfig.get_solo()
        cfg.is_active = False
        cfg.save(update_fields=["is_active", "updated_at"])
        return res, p, addr

    def staff_client(self):
        staff = StaffUser(email=email("kyc"), full_name="KYC Officer")
        staff.set_password(PASS)
        staff.save()
        client = APIClient()
        res = client.post("/api/admin/auth/login/", {"email": staff.email, "password": PASS}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return client

    def payload(self, p, publish=True):
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
            "contact_via": "phone",
            "photos": [PIXEL_PNG],
            "publish": publish,
            "promote": False,
        }

    def test_unverified_seller_cannot_post(self):
        res = self.client.post(
            "/api/auth/register/",
            {"full_name": "Seller", "password": PASS, "account_type": "provider", "phone": phone()},
            format="json",
        )
        self.auth(res.data["access"])
        posted = self.client.post("/api/listings/me/", self.payload(phone()), format="json")
        self.assertEqual(posted.status_code, 403)

    def test_listing_live_immediately_and_admin_can_reject(self):
        _, p, addr = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.payload(p), format="json")
        self.assertEqual(posted.status_code, 201, posted.data)
        self.assertEqual(posted.data["status"], "approved")
        listing_id = posted.data["id"]

        anon = APIClient()
        feed = anon.get("/api/listings/feed/")
        self.assertEqual(feed.status_code, 200)
        self.assertEqual(len(feed.data), 1)
        self.assertEqual(feed.data[0]["id"], listing_id)

        mine = self.client.get("/api/listings/me/")
        self.assertEqual(len(mine.data), 1)
        self.assertEqual(mine.data[0]["status"], "approved")

        staff = self.staff_client()
        listed = staff.get("/api/admin/listings/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

        rejected = staff.patch(
            f"/api/admin/listings/{listing_id}/",
            {"status": "rejected"},
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)

        rejected = staff.patch(
            f"/api/admin/listings/{listing_id}/",
            {"status": "rejected", "reason": "Photos are unclear and the price looks unrealistic."},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200, rejected.data)
        self.assertEqual(rejected.data["status"], "rejected")
        self.assertIn("unclear", rejected.data["admin_reason"])

        mine = self.client.get("/api/listings/me/")
        self.assertEqual(mine.data[0]["admin_reason"], "Photos are unclear and the price looks unrealistic.")
        feed = anon.get("/api/listings/feed/")
        self.assertEqual(feed.data, [])

        republish = self.client.patch(
            f"/api/listings/me/{listing_id}/",
            {**self.payload(p), "title": "Updated house in Lahan"},
            format="json",
        )
        self.assertEqual(republish.status_code, 200, republish.data)
        self.assertEqual(republish.data["status"], "approved")

        feed = anon.get("/api/listings/feed/")
        self.assertEqual(len(feed.data), 1)
        self.assertEqual(feed.data[0]["title"], "Updated house in Lahan")
        self.assertEqual(Listing.objects.get(pk=listing_id).status, Listing.STATUS_APPROVED)
        owner_id = feed.data[0]["owner_id"]
        by_owner = anon.get(f"/api/listings/feed/?owner={owner_id}")
        self.assertEqual(len(by_owner.data), 1)
        empty = anon.get("/api/listings/feed/?owner=00000000-0000-0000-0000-000000000000")
        self.assertEqual(empty.data, [])

        buyer = APIClient()
        signed = buyer.post(
            "/api/auth/register/",
            {"full_name": "Buyer One", "password": PASS, "account_type": "user", "phone": phone()},
            format="json",
        )
        self.assertEqual(signed.status_code, 201, signed.data)
        buyer.credentials(HTTP_AUTHORIZATION=f"Bearer {signed.data['access']}")
        profile = buyer.get(f"/api/listings/sellers/{owner_id}/")
        self.assertEqual(profile.status_code, 200, profile.data)
        self.assertEqual(profile.data["full_name"], "Seller One")
        self.assertEqual(profile.data["phone"], p)
        self.assertEqual(profile.data["email"], addr)
        self.assertEqual(profile.data["address"], "Lahan-10, Siraha")
        self.assertEqual(len(profile.data["listings"]), 1)
        self.assertTrue(profile.data["photo_url"])

    def test_approved_edit_stays_live_until_admin_approves(self):
        _, p, _ = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.payload(p), format="json")
        listing_id = posted.data["id"]
        staff = self.staff_client()
        # Listing is live on publish; staff approval only needed for edit requests.

        edited = self.client.patch(
            f"/api/listings/me/{listing_id}/",
            {**self.payload(p), "title": "Edited title for review", "description": "Seller updated the copy."},
            format="json",
        )
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(edited.data["status"], "approved")
        self.assertTrue(edited.data["has_pending_edit"])
        self.assertEqual(edited.data["title"], "3 BHK house in Lahan")
        self.assertEqual(edited.data["pending_edit"]["title"], "Edited title for review")

        anon = APIClient()
        live = anon.get(f"/api/listings/{listing_id}/")
        self.assertEqual(live.status_code, 200)
        self.assertEqual(live.data["title"], "3 BHK house in Lahan")
        self.assertEqual(live.data["view_count"], 1)
        self.assertEqual(live.data["pending_edit"], {})

        approved_edit = staff.patch(f"/api/admin/listings/{listing_id}/", {"status": "approved"}, format="json")
        self.assertEqual(approved_edit.status_code, 200, approved_edit.data)
        self.assertFalse(approved_edit.data["has_pending_edit"])
        self.assertEqual(approved_edit.data["title"], "Edited title for review")

    def test_buyer_can_comment_and_review(self):
        _, p, _ = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.payload(p), format="json")
        listing_id = posted.data["id"]
        staff = self.staff_client()
        # Listing is live on publish; staff approval only needed for edit requests.

        buyer = APIClient()
        buyer_phone = phone()
        reg = buyer.post(
            "/api/auth/register/",
            {"full_name": "Buyer One", "password": PASS, "account_type": "user", "phone": buyer_phone},
            format="json",
        )
        self.assertEqual(reg.status_code, 201, reg.data)
        buyer.credentials(HTTP_AUTHORIZATION=f"Bearer {reg.data['access']}")
        comment = buyer.post(f"/api/listings/{listing_id}/comments/", {"text": "Is parking included?"}, format="json")
        self.assertEqual(comment.status_code, 201, comment.data)
        self.assertEqual(comment.data["comment_count"], 1)
        review = buyer.post(
            f"/api/listings/{listing_id}/reviews/",
            {"rating": 5, "text": "Visited and it matched the photos."},
            format="json",
        )
        self.assertEqual(review.status_code, 200, review.data)
        self.assertEqual(review.data["review_count"], 1)
        saved = buyer.post(f"/api/listings/{listing_id}/save/", {}, format="json")
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.data["save_count"], 1)
        self.assertTrue(saved.data["saved_by_me"])

    def test_feed_includes_listings_without_sold_flag_in_extras(self):
        """extras__sold=True DB lookup wrongly hid listings; feed must show normal extras."""
        _, p, _ = self.verified_provider()
        for title in ("House A", "House B", "House C"):
            posted = self.client.post(
                "/api/listings/me/",
                {
                    **self.payload(p),
                    "title": title,
                    "extras": {"dealType": "Used", "features": ["Verified"]},
                },
                format="json",
            )
            self.assertEqual(posted.status_code, 201, posted.data)
        feed = APIClient().get("/api/listings/feed/")
        self.assertEqual(feed.status_code, 200)
        titles = {row["title"] for row in feed.data}
        self.assertTrue({"House A", "House B", "House C"}.issubset(titles))

    def test_feed_hides_marked_sold_listings(self):
        _, p, _ = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.payload(p), format="json")
        self.assertEqual(posted.status_code, 201, posted.data)
        listing_id = posted.data["id"]
        sold = self.client.post(f"/api/listings/me/{listing_id}/sold/", {"sold": True}, format="json")
        self.assertEqual(sold.status_code, 200, sold.data)
        feed = APIClient().get("/api/listings/feed/")
        self.assertEqual(feed.data, [])

        _, p, _ = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.payload(p), format="json")
        self.assertEqual(posted.status_code, 201, posted.data)
        listing_id = posted.data["id"]
        staff = self.staff_client()
        deleted = staff.delete(f"/api/admin/listings/{listing_id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Listing.objects.filter(pk=listing_id).exists())
        feed = APIClient().get("/api/listings/feed/")
        self.assertEqual(feed.data, [])

    def test_job_listing_can_omit_photos(self):
        _, p, _ = self.verified_provider()
        body = self.payload(p)
        body.update(
            {
                "category": "jobs",
                "subcategory": "On-site",
                "title": "Sales Executive — Lahan",
                "photos": [],
                "extras": {"dealType": "Full time", "company": "NAJIK Services", "experience": "Entry level"},
            }
        )
        posted = self.client.post("/api/listings/me/", body, format="json")
        self.assertEqual(posted.status_code, 201, posted.data)
        self.assertEqual(posted.data["category"], "jobs")
        self.assertEqual(posted.data["photos"], [])
        self.assertEqual(posted.data["status"], "approved")

    def test_property_listing_can_omit_price_and_photos(self):
        _, p, _ = self.verified_provider()
        body = self.payload(p)
        body["photos"] = []
        body["price"] = ""
        posted = self.client.post("/api/listings/me/", body, format="json")
        self.assertEqual(posted.status_code, 201, posted.data)
        self.assertEqual(posted.data["photos"], [])
        self.assertEqual(posted.data["price"], "")

    def test_owner_can_open_listing_photo(self):
        _, p, _ = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.payload(p), format="json")
        self.assertEqual(posted.status_code, 201, posted.data)
        self.assertEqual(posted.data["status"], "approved")
        self.assertTrue(posted.data["photos"])
        from urllib.parse import urlparse

        path = urlparse(posted.data["photos"][0]["url"]).path
        photo = self.client.get(path)
        self.assertEqual(photo.status_code, 200)
        public = APIClient().get(path)
        self.assertEqual(public.status_code, 200)

    def test_staff_list_excludes_drafts_and_filters_category(self):
        _, p, _ = self.verified_provider()
        draft = self.client.post("/api/listings/me/", self.payload(p, publish=False), format="json")
        self.assertEqual(draft.status_code, 201, draft.data)
        self.assertEqual(draft.data["status"], "draft")
        job = self.client.post(
            "/api/listings/me/",
            {
                **self.payload(p),
                "category": "jobs",
                "subcategory": "On-site",
                "title": "Warehouse helper",
                "photos": [],
            },
            format="json",
        )
        self.assertEqual(job.status_code, 201, job.data)
        house = self.client.post("/api/listings/me/", self.payload(p), format="json")
        self.assertEqual(house.status_code, 201, house.data)

        staff = self.staff_client()
        listed = staff.get("/api/admin/listings/")
        self.assertEqual(listed.status_code, 200)
        ids = [row["id"] for row in listed.data]
        self.assertNotIn(draft.data["id"], ids)
        self.assertIn(job.data["id"], ids)
        self.assertIn(house.data["id"], ids)

        jobs_only = staff.get("/api/admin/listings/?category=jobs")
        self.assertEqual(jobs_only.status_code, 200)
        self.assertEqual([row["id"] for row in jobs_only.data], [job.data["id"]])
        self.assertTrue(all(row["category"] == "jobs" for row in jobs_only.data))

        properties_only = staff.get("/api/admin/listings/?category=property")
        self.assertEqual([row["id"] for row in properties_only.data], [house.data["id"]])

    def test_public_listing_ignores_invalid_bearer_token(self):
        _, p, _ = self.verified_provider()
        posted = self.client.post("/api/listings/me/", self.payload(p), format="json")
        listing_id = posted.data["id"]
        staff = self.staff_client()
        # Listing is live on publish; staff approval only needed for edit requests.

        stale = APIClient()
        stale.credentials(HTTP_AUTHORIZATION="Bearer not-a-jwt")
        res = stale.get(f"/api/listings/{listing_id}/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["id"], listing_id)
