import { api } from "./api";
import { optionalAppAccessToken, withAppAuth } from "./authApi";
import { emitListingsChanged } from "./listingsRefresh";

export type ApiListingPhoto = { id: string; url: string; sort_order: number; is_pending?: boolean };

export type ApiListing = {
  id: string;
  status: "draft" | "pending" | "approved" | "rejected";
  category: string;
  subcategory: string;
  title: string;
  description: string;
  price: string;
  negotiable: boolean;
  location: string;
  city: string;
  district: string;
  lat: number | null;
  lng: number | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_via: string;
  extras: Record<string, string | number | boolean | string[]>;
  promote_requested: boolean;
  is_promoted: boolean;
  admin_reason: string;
  reviewed_at: string | null;
  created_at: string;
  photos: ApiListingPhoto[];
  owner_name: string;
  owner_id: string;
  view_count: number;
  save_count: number;
  comment_count: number;
  review_count: number;
  rating_avg: number;
  seller_verified: boolean;
  comments: { id: string; author_name: string; text: string; created_at: string }[];
  reviews: { id: string; author_name: string; rating: number; text: string; created_at: string }[];
  has_pending_edit: boolean;
  pending_edit: Record<string, unknown>;
  saved_by_me: boolean;
};

export type ListingWritePayload = {
  category: string;
  subcategory: string;
  title: string;
  description: string;
  price: string;
  negotiable: boolean;
  location: string;
  city?: string;
  district?: string;
  lat?: number | null;
  lng?: number | null;
  contact_name?: string;
  contact_phone: string;
  contact_email?: string;
  contact_whatsapp?: string;
  contact_via: string;
  extras?: Record<string, string | number | boolean | string[]>;
  photos?: string[];
  promote: boolean;
  publish: boolean;
};

export type FeedQuery = {
  q?: string;
  category?: string;
  subcategory?: string;
  sort?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  min_lat?: number;
  max_lat?: number;
  min_lng?: number;
  max_lng?: number;
  min_price?: string;
  max_price?: string;
  verified?: boolean;
  min_rating?: number;
  place?: string;
  owner?: string;
};

export type SellerPublicProfile = {
  id: string;
  full_name: string;
  account_type: "user" | "provider";
  phone: string;
  email: string;
  address: string;
  service_type: string;
  photo_url: string | null;
  listings: ApiListing[];
};

export async function fetchSellerProfile(id: string) {
  return withAppAuth((token) => api<SellerPublicProfile>(`/api/listings/sellers/${id}/`, { token }));
}

export async function fetchListingFeed(categoryOrQuery?: string | FeedQuery) {
  const params = new URLSearchParams();
  if (typeof categoryOrQuery === "string") {
    if (categoryOrQuery) params.set("category", categoryOrQuery);
  } else if (categoryOrQuery) {
    const { verified, ...rest } = categoryOrQuery;
    if (verified) params.set("verified", "1");
    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null) return;
      params.set(key, String(value));
    });
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return api<ApiListing[]>(`/api/listings/feed/${query}`);
}

export async function fetchListing(id: string) {
  const token = await optionalAppAccessToken();
  return api<ApiListing>(`/api/listings/${id}/`, { token });
}

export async function fetchMyListings() {
  return withAppAuth((token) => api<ApiListing[]>("/api/listings/me/", { token }));
}

export async function createListing(payload: ListingWritePayload) {
  const row = await withAppAuth((token) =>
    api<ApiListing>("/api/listings/me/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
  emitListingsChanged();
  return row;
}

export async function updateListing(id: string, payload: ListingWritePayload) {
  const row = await withAppAuth((token) =>
    api<ApiListing>(`/api/listings/me/${id}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  );
  emitListingsChanged();
  return row;
}

export async function postListingComment(id: string, text: string) {
  return withAppAuth((token) =>
    api<ApiListing>(`/api/listings/${id}/comments/`, {
      method: "POST",
      token,
      body: JSON.stringify({ text }),
    }),
  );
}

export async function postListingReview(id: string, rating: number, text: string) {
  return withAppAuth((token) =>
    api<ApiListing>(`/api/listings/${id}/reviews/`, {
      method: "POST",
      token,
      body: JSON.stringify({ rating, text }),
    }),
  );
}

export async function toggleListingSave(id: string) {
  return withAppAuth((token) =>
    api<ApiListing>(`/api/listings/${id}/save/`, {
      method: "POST",
      token,
      body: JSON.stringify({}),
    }),
  );
}

let listingsPollSig = "";

export function resetListingsPoll() {
  listingsPollSig = "";
}

export async function pollMyListingsIfChanged() {
  const rows = await fetchMyListings();
  const sig = rows
    .map((row) => `${row.id}:${row.status}:${row.has_pending_edit ? 1 : 0}:${row.reviewed_at || ""}`)
    .join("|");
  if (sig === listingsPollSig) return false;
  listingsPollSig = sig;
  emitListingsChanged();
  return true;
}
