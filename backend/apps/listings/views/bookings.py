import json

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import AppJWTAuthentication
from apps.accounts.models import AppUser
from apps.accounts.permissions import IsAppUser
from apps.chat.models import ChatMessage, ChatThread
from apps.chat.presence import is_viewing_thread
from apps.listings.models import Booking, Listing
from apps.notifications.models import InboxNotice
from apps.notifications.services import notify_user
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


class BookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_photo = serializers.SerializerMethodField()
    other_name = serializers.SerializerMethodField()
    other_id = serializers.SerializerMethodField()
    i_requested = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "listing",
            "listing_title",
            "listing_photo",
            "thread",
            "scheduled_at",
            "location",
            "lat",
            "lng",
            "item",
            "contact_name",
            "contact_phone",
            "note",
            "status",
            "created_at",
            "other_name",
            "other_id",
            "i_requested",
        )

    def _request_user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def get_listing_photo(self, obj):
        request = self.context.get("request")
        photo = obj.listing.photos.filter(is_pending=False).order_by("sort_order").first()
        if not photo or not request:
            return None
        return request.build_absolute_uri(f"/api/listings/{obj.listing_id}/photos/{photo.id}/")

    def get_other_name(self, obj):
        user = self._request_user()
        other = obj.other_user(user) if user else obj.recipient
        return other.full_name or "NAJIK user"

    def get_other_id(self, obj):
        user = self._request_user()
        other = obj.other_user(user) if user else obj.recipient
        return str(other.id)

    def get_i_requested(self, obj):
        user = self._request_user()
        return bool(user and user.id == obj.requester_id)


class BookingWriteSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()
    buyer_id = serializers.UUIDField(required=False)
    scheduled_at = serializers.CharField()
    location = serializers.CharField(max_length=200)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    item = serializers.CharField(max_length=160, required=False, allow_blank=True)
    contact_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    contact_phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate(self, attrs):
        listing = Listing.objects.select_related("owner").filter(pk=attrs["listing_id"], status=Listing.STATUS_APPROVED).first()
        if not listing:
            raise serializers.ValidationError("Listing not found.")
        extras = listing.extras or {}
        if extras.get("sold") in (True, "true"):
            raise serializers.ValidationError("This listing is sold.")
        when = parse_datetime(attrs["scheduled_at"])
        if not when:
            raise serializers.ValidationError({"scheduled_at": "Use a valid date and time."})
        attrs["listing"] = listing
        attrs["when"] = when
        return attrs


def ensure_thread(listing, buyer, seller):
    thread, _created = ChatThread.objects.get_or_create(
        listing=listing,
        buyer=buyer,
        defaults={
            "seller": seller,
            "listing_title": listing.title,
            "listing_price": listing.price or "",
            "listing_location": listing.location or "",
        },
    )
    return thread


def booking_chat_payload(booking: Booking):
    return {
        "type": "booking",
        "id": str(booking.id),
        "status": booking.status,
        "item": booking.item or booking.listing.title,
        "when": booking.scheduled_at.isoformat(),
        "where": booking.location,
        "note": booking.note,
        "contact_name": booking.contact_name,
        "contact_phone": booking.contact_phone,
        "requester_id": str(booking.requester_id),
        "recipient_id": str(booking.recipient_id),
        "thread": str(booking.thread_id) if booking.thread_id else None,
    }


def booking_friendly_text(booking: Booking, action: str) -> str:
    item = booking.item or booking.listing.title
    when = booking.scheduled_at.strftime("%d %b %Y, %I:%M %p").replace(" 0", " ")
    where = booking.location
    if action == "request":
        return f"Hi, I've sent a booking request for {item} on {when} at {where}. Please accept if that time works for you."
    if action == "accept":
        return f"Good news — I've accepted the booking for {item} on {when}. See you at {where}."
    if action == "reject":
        return f"Sorry, I have to decline the booking for {item} on {when}. Feel free to send another time that works."
    return f"I've cancelled the booking for {item} on {when}. Sorry for the inconvenience — we can reschedule anytime."


def maybe_notify_booking(user, booking, title: str, body: str, sender_name: str = ""):
    try:
        thread = ChatThread.objects.filter(pk=booking.thread_id).first() if booking.thread_id else booking.thread
        if is_viewing_thread(user, thread):
            return
        notify_user(user, title, body, InboxNotice.KIND_BOOKING, "booking", booking.id, sender_name=sender_name)
    except Exception:
        pass


def post_booking_message(booking: Booking, sender, action: str, label: str):
    if not booking.thread_id:
        return
    ChatMessage.objects.create(
        thread=booking.thread,
        sender=sender,
        kind="booking",
        text=json.dumps(booking_chat_payload(booking)),
        location_label=label,
    )
    ChatMessage.objects.create(
        thread=booking.thread,
        sender=sender,
        kind="text",
        text=booking_friendly_text(booking, action),
    )
    ChatThread.objects.filter(pk=booking.thread_id).update(updated_at=booking.updated_at)


class BookingListCreateView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def get(self, request):
        items = Booking.objects.select_related("listing", "requester", "recipient", "thread").filter(
            Q(requester=request.user) | Q(recipient=request.user)
        )
        return Response(BookingSerializer(items, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = BookingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.validated_data["listing"]
        user = request.user
        if listing.owner_id == user.id:
            buyer_id = serializer.validated_data.get("buyer_id")
            if not buyer_id:
                raise serializers.ValidationError({"buyer_id": "Choose the buyer for this visit."})
            buyer = get_object_or_404(AppUser, pk=buyer_id)
            if buyer.id == user.id:
                return Response({"detail": "Pick a different person."}, status=status.HTTP_400_BAD_REQUEST)
            seller = user
        else:
            buyer = user
            seller = listing.owner
        recipient = seller if user.id == buyer.id else buyer
        thread = ensure_thread(listing, buyer, seller)
        booking = Booking.objects.create(
            listing=listing,
            requester=user,
            recipient=recipient,
            thread=thread,
            scheduled_at=serializer.validated_data["when"],
            location=serializer.validated_data["location"].strip(),
            lat=serializer.validated_data.get("lat"),
            lng=serializer.validated_data.get("lng"),
            item=(serializer.validated_data.get("item") or listing.title).strip(),
            contact_name=(serializer.validated_data.get("contact_name") or user.full_name or "").strip(),
            contact_phone=(serializer.validated_data.get("contact_phone") or user.phone or "").strip()[:15],
            note=(serializer.validated_data.get("note") or "").strip(),
        )
        post_booking_message(booking, user, "request", "Booking request")
        if user.id == buyer.id:
            try:
                from apps.promotions.boost_service import record_boost_inquiry_for_listing

                record_boost_inquiry_for_listing(listing.id, sender=user)
            except Exception:
                pass
        maybe_notify_booking(
            recipient,
            booking,
            "Booking request",
            f"For {listing.title}",
            sender_name=(user.full_name or user.phone or "Someone").strip(),
        )
        booking = Booking.objects.select_related("listing", "requester", "recipient", "thread").get(pk=booking.pk)
        return Response(BookingSerializer(booking, context={"request": request}).data, status=status.HTTP_201_CREATED)


class BookingActionView(APIView):
    authentication_classes = [AppJWTAuthentication]
    permission_classes = [IsAppUser]

    def post(self, request, pk):
        booking = get_object_or_404(
            Booking.objects.select_related("listing", "requester", "recipient", "thread"),
            pk=pk,
        )
        if not booking.is_party(request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        action = (request.data.get("action") or "").strip().lower()
        if action == "accept":
            if request.user.id != booking.recipient_id:
                return Response({"detail": "Only the other party can accept."}, status=status.HTTP_403_FORBIDDEN)
            if booking.status != Booking.STATUS_PENDING:
                return Response({"detail": "This request is no longer pending."}, status=status.HTTP_400_BAD_REQUEST)
            booking.status = Booking.STATUS_ACCEPTED
            title = "Booking accepted"
        elif action == "reject":
            if request.user.id != booking.recipient_id:
                return Response({"detail": "Only the other party can reject."}, status=status.HTTP_403_FORBIDDEN)
            if booking.status != Booking.STATUS_PENDING:
                return Response({"detail": "This request is no longer pending."}, status=status.HTTP_400_BAD_REQUEST)
            booking.status = Booking.STATUS_REJECTED
            title = "Booking rejected"
        elif action == "cancel":
            if booking.status not in (Booking.STATUS_PENDING, Booking.STATUS_ACCEPTED):
                return Response({"detail": "This booking cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
            booking.status = Booking.STATUS_CANCELLED
            title = "Booking cancelled"
        else:
            return Response({"detail": "Use accept, reject, or cancel."}, status=status.HTTP_400_BAD_REQUEST)
        booking.save(update_fields=["status", "updated_at"])
        post_booking_message(booking, request.user, action, title)
        actor = (request.user.full_name or request.user.phone or "Someone").strip()
        maybe_notify_booking(
            booking.other_user(request.user),
            booking,
            title,
            f"{booking.listing.title} · {booking.location}",
            sender_name=actor,
        )
        return Response(BookingSerializer(booking, context={"request": request}).data)


class StaffBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_owner_name = serializers.CharField(source="listing.owner.full_name", read_only=True)
    listing_owner_id = serializers.UUIDField(source="listing.owner_id", read_only=True)
    requester_name = serializers.CharField(source="requester.full_name", read_only=True)
    recipient_name = serializers.CharField(source="recipient.full_name", read_only=True)
    city = serializers.CharField(source="listing.city", read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "listing",
            "listing_title",
            "listing_owner_name",
            "listing_owner_id",
            "requester",
            "requester_name",
            "recipient",
            "recipient_name",
            "scheduled_at",
            "location",
            "city",
            "item",
            "contact_name",
            "contact_phone",
            "note",
            "status",
            "created_at",
        )


class StaffBookingListView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = Booking.objects.select_related("listing", "listing__owner", "requester", "recipient").order_by("-created_at")
        status_filter = (request.query_params.get("status") or "").strip()
        if status_filter:
            items = items.filter(status=status_filter)
        items = items[:500]
        return Response(StaffBookingSerializer(items, many=True).data)
