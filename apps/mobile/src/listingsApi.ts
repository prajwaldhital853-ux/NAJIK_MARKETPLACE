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
  is_boosted?: boolean;
  boost_paused?: boolean;
  has_live_boost?: boolean;
  boost_campaign_id?: string | null;
  boost_days_remaining?: number;
  can_be_boosted?: boolean;
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
  page?: number;
  page_size?: number;
};

export type FeedResponse = {
  results: ApiListing[];
  page: number;
  page_size: number;
  has_next: boolean;
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

export async function fetchListingFeed(categoryOrQuery?: string | FeedQuery): Promise<ApiListing[]> {
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
  const response = await api<ApiListing[] | FeedResponse>(`/api/listings/feed/${query}`);
  
  // Support both legacy array response and new paginated response
  const rows = Array.isArray(response) ? response : response.results;
  rememberListingFeed(rows);
  return rows;
}

export async function fetchListingFeedPaginated(categoryOrQuery?: string | FeedQuery): Promise<FeedResponse> {
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
  if (!params.has("page")) params.set("page", "1");
  if (!params.has("page_size")) params.set("page_size", "10");
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api<FeedResponse | ApiListing[]>(`/api/listings/feed/${query}`);
  if (Array.isArray(response)) {
    rememberListingFeed(response);
    return {
      results: response,
      page: 1,
      page_size: response.length,
      has_next: response.length >= Number(params.get("page_size") || 10),
    };
  }
  const results = Array.isArray(response?.results) ? response.results : [];
  rememberListingFeed(results);
  return {
    results,
    page: Number(response?.page) || 1,
    page_size: Number(response?.page_size) || results.length,
    has_next: Boolean(response?.has_next),
  };
}

export function prefetchListing(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  prefetchListingDetail(fetchListing, id);
}

export async function fetchListing(id: string, options?: { bypassCache?: boolean }) {
  if (!options?.bypassCache) {
    const cached = peekListingDetail(id);
    if (cached) return cached;
  }
  const token = await optionalAppAccessToken();
  const row = await api<ApiListing>(`/api/listings/${id}/`, { token });
  rememberListingDetail(row);
  return row;
}

export async function recordListingViewOnServer(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const token = await optionalAppAccessToken();
  try {
    return await api<{ view_count: number; recorded: boolean }>(`/api/listings/${id}/view/`, {
      method: "POST",
      token,
    });
  } catch {
    return null;
  }
}

export async function fetchMyListings(page?: number, page_size?: number): Promise<ApiListing[]> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (page_size) params.set("page_size", String(page_size));
  const query = params.toString() ? `?${params.toString()}` : "";
  
  const response = await withAppAuth((token) => api<ApiListing[] | FeedResponse>(`/api/listings/me/${query}`, { token }));
  return Array.isArray(response) ? response : response.results;
}

export async function fetchMyListingsPaginated(page = 1, page_size = 20): Promise<FeedResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
  const response = await withAppAuth((token) => api<FeedResponse | ApiListing[]>(`/api/listings/me/?${params.toString()}`, { token }));
  if (Array.isArray(response)) {
    return { results: response, page, page_size, has_next: response.length >= page_size };
  }
  const results = Array.isArray(response?.results) ? response.results : [];
  return {
    results,
    page: Number(response?.page) || page,
    page_size: Number(response?.page_size) || page_size,
    has_next: Boolean(response?.has_next),
  };
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

export async function deleteMyListing(id: string, confirm = false) {
  await withAppAuth((token) =>
    api<void>(`/api/listings/me/${id}/${confirm ? "?confirm=1" : ""}`, { method: "DELETE", token }),
  );
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
  const row = await withAppAuth((token) =>
    api<ApiListing>(`/api/listings/${id}/comments/`, {
      method: "POST",
      token,
      body: JSON.stringify({ text, parent_id: parentId || undefined }),
    }),
  );
  rememberListingDetail(row);
  emitListingsChanged();
  return row;
}

export async function postListingReview(id: string, rating: number, text?: string) {
  const row = await withAppAuth((token) =>
    api<ApiListing>(`/api/listings/${id}/reviews/`, {
      method: "POST",
      token,
      body: JSON.stringify({ rating, text: text?.trim() || "" }),
    }),
  );
  rememberListingDetail(row);
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
