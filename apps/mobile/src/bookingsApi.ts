import { api } from "./api";
import { withAppAuth } from "./authApi";

export type ApiBooking = {
  id: string;
  listing: string;
  listing_title: string;
  listing_photo: string | null;
  thread: string | null;
  scheduled_at: string;
  location: string;
  lat: number | null;
  lng: number | null;
  item: string;
  contact_name: string;
  contact_phone: string;
  note: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  other_name: string;
  other_id: string;
  i_requested: boolean;
};

export type BookingWrite = {
  listing_id: string;
  buyer_id?: string;
  scheduled_at: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  item?: string;
  contact_name?: string;
  contact_phone?: string;
  note?: string;
};

export async function fetchBookings() {
  return withAppAuth((token) => api<ApiBooking[]>("/api/listings/bookings/", { token }));
}

export async function createBooking(payload: BookingWrite) {
  return withAppAuth((token) =>
    api<ApiBooking>("/api/listings/bookings/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
}

export async function bookingAction(id: string, action: "accept" | "reject" | "cancel") {
  return withAppAuth((token) =>
    api<ApiBooking>(`/api/listings/bookings/${id}/action/`, {
      method: "POST",
      token,
      body: JSON.stringify({ action }),
    }),
  );
}
