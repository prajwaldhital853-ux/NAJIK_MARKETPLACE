import { api } from "./api";
import { optionalAppAccessToken, withAppAuth } from "./authApi";
import { emitListingsChanged } from "./listingsRefresh";
import { peekListingDetail, prefetchListingDetail, rememberListingDetail, rememberListingFeed } from "./listingCache";

export type ApiListingPhoto = { id: string; url: string; sort_order: number; is_pending?: boolean };

export type ApiListing = {
  id: string;
  status: "draft" | "pending" | "approved" | "rejected" | "deactivated";
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
  is_urgent?: boolean;
  urgent_ends_at?: string | null;
  admin_reason: string;
  reviewed_at: string | null;
  created_at: string;
  photos: ApiListingPhoto[];
  owner_name: string;
  owner_id: string;
  owner_photo_url?: string | null;
  view_count: number;
  save_count: number;
  comment_count: number;
  review_count: number;
  rating_avg: number;
  seller_verified: boolean;
  comments: {
    id: string;
    author_id?: string;
    author_name: string;
    text: string;
    created_at: string;
    parent?: string | null;
    replies?: { id: string; author_id?: string; author_name: string; text: string; created_at: string; parent?: string | null }[];
  }[];
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
  urgent?: string;
  limit?: number;
};

export type SellerPublicProfile = {
  id: string;
  full_name: string;
  business_name?: string;
  account_type: "user" | "provider";
  phone: string;
  email: string;
  address: string;
  service_type: string;
  photo_url: string | null;
  rating_avg?: number;
  review_count?: number;
  reviews?: {
    id: string;
    author_id: string;
    author_name: string;
    rating: number;
    text: string;
    created_at: string;
    listing?: string;
    listing_title?: string;
  }[];
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
  const rows = await api<ApiListing[]>(`/api/listings/feed/${query}`);
  rememberListingFeed(rows);
  return rows;
}

export function prefetchListing(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  prefetchListingDetail(fetchListing, id);
}

export async function fetchListing(id: string) {
  const cached = peekListingDetail(id);
  if (cached) return cached;
  const token = await optionalAppAccessToken();
  const row = await api<ApiListing>(`/api/listings/${id}/`, { token });
  rememberListingDetail(row);
  return row;
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

export async function deleteMyListing(id: string) {
  await withAppAuth((token) => api<void>(`/api/listings/me/${id}/`, { method: "DELETE", token }));
  emitListingsChanged();
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

export async function setListingSold(id: string, sold: boolean) {
  const row = await withAppAuth((token) =>
    api<ApiListing>(`/api/listings/me/${id}/sold/`, {
      method: "POST",
      token,
      body: JSON.stringify({ sold }),
    }),
  );
  emitListingsChanged();
  return row;
}

export async function fetchSavedListings() {
  return withAppAuth((token) => api<ApiListing[]>("/api/listings/saved/", { token }));
}

export type MyReviewGiven = {
  id: string;
  rating: number;
  text: string;
  created_at: string;
  seller_id: string;
  seller_name: string;
  listing_id: string;
  listing_title: string;
};

export async function fetchMyReviewsGiven() {
  return withAppAuth((token) => api<MyReviewGiven[]>("/api/listings/me/reviews-given/", { token }));
}

export type MySellerReviewsPayload = {
  reviews: NonNullable<SellerPublicProfile["reviews"]>;
  review_count: number;
  rating_avg: number;
};

export async function fetchMySellerReviews() {
  return withAppAuth((token) => api<MySellerReviewsPayload>("/api/listings/me/reviews-received/", { token }));
}

export async function postListingComment(id: string, text: string, parentId?: string) {
  return withAppAuth((token) =>
    api<ApiListing>(`/api/listings/${id}/comments/`, {
      method: "POST",
      token,
      body: JSON.stringify({ text, parent_id: parentId || undefined }),
    }),
  );
}

export async function postListingReview(id: string, rating: number, text?: string) {
  const row = await withAppAuth((token) =>
    api<ApiListing>(`/api/listings/${id}/reviews/`, {
      method: "POST",
      token,
      body: JSON.stringify({ rating, text: text?.trim() || "" }),
    }),
  );
  emitListingsChanged();
  return row;
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
