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
from apps.listings.models import Booking, Listing
from apps.notifications.models import InboxNotice
from apps.notifications.services import notify_user


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
    }


def post_booking_message(booking: Booking, sender, label: str):
    if not booking.thread_id:
        return
    ChatMessage.objects.create(
        thread=booking.thread,
        sender=sender,
        kind="booking",
        text=json.dumps(booking_chat_payload(booking)),
        location_label=label,
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
        post_booking_message(booking, user, "Booking request")
        notify_user(
            recipient,
            "New booking request",
            f"{user.full_name or 'Someone'} sent a booking for {listing.title}.",
            InboxNotice.KIND_BOOKING,
            "booking",
            booking.id,
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
        post_booking_message(booking, request.user, title)
        notify_user(
            booking.other_user(request.user),
            title,
            f"{booking.listing.title} · {booking.location}",
            InboxNotice.KIND_BOOKING,
            "booking",
            booking.id,
        )
        return Response(BookingSerializer(booking, context={"request": request}).data)
