import { api, ApiError } from "./api";
import { getStaffAccessToken, getStaffRefreshToken, saveStaffTokens } from "./auth";
import { getDeviceFingerprint } from "./device";
import type { Staff } from "./demo-data";
import { accessTokenFresh } from "./jwt";

const REFRESH_SKEW_MS = 60_000;
const KEEP_ALIVE_SKEW_MS = 15 * 60 * 1000;

let refreshInflight: Promise<string> | null = null;

export async function refreshStaffSession() {
  if (!refreshInflight) {
    refreshInflight = (async () => {
      const refresh = getStaffRefreshToken();
      if (!refresh) throw new Error("Not signed in");
      const data = await api<{ access: string; refresh: string }>("/api/admin/auth/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
      saveStaffTokens(data.access, data.refresh);
      return data.access;
    })().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

export async function ensureStaffAccessToken(skewMs = REFRESH_SKEW_MS) {
  const access = getStaffAccessToken();
  if (accessTokenFresh(access, skewMs)) return access;
  return refreshStaffSession();
}

export async function keepStaffSessionAlive() {
  return ensureStaffAccessToken(KEEP_ALIVE_SKEW_MS);
}

async function staffRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const run = (token: string) => api<T>(path, { ...init, token });
  const token = await ensureStaffAccessToken();
  try {
    return await run(token);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    const latest = getStaffAccessToken();
    if (latest && latest !== token && accessTokenFresh(latest, 0)) {
      return run(latest);
    }
    return run(await refreshStaffSession());
  }
}

type StaffApiUser = {
  id: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  must_change_password?: boolean;
  permissions?: string[];
  role?: { id: string; name: string; description?: string; is_system_role?: boolean };
};

type StaffLoginApiResponse =
  | {
      access: string;
      refresh: string;
      user: StaffApiUser;
    }
  | {
      requires_verification: true;
      staff_id: string;
      email: string;
      message: string;
      debug_code?: string;
    };

export type StaffLoginResult =
  | { status: "authenticated"; staff: Staff }
  | { status: "verify"; staffId: string; email: string; message: string; debugCode?: string };

export function mapApiStaff(user: StaffApiUser): Staff {
  return {
    id: user.id,
    name: user.full_name || user.email,
    email: user.email,
    role: user.is_super_admin ? "Super Administrator" : user.role?.name || "Staff",
    roleKey: user.is_super_admin ? "super" : "kyc",
    city: "—",
    status: "active",
    lastLogin: "Just now",
    password: "",
    isSuperAdmin: user.is_super_admin,
    permissions: user.permissions || [],
    mustChangePassword: Boolean(user.must_change_password),
  };
}

export async function staffApiLogin(email: string, password: string): Promise<StaffLoginResult> {
  const data = await api<StaffLoginApiResponse>("/api/admin/auth/login/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      device_fingerprint: getDeviceFingerprint(),
    }),
  });

  if ("requires_verification" in data && data.requires_verification) {
    return {
      status: "verify",
      staffId: data.staff_id,
      email: data.email,
      message: data.message,
      debugCode: data.debug_code,
    };
  }

  // TypeScript now knows data is the authenticated response
  const authData = data as { access: string; refresh: string; user: StaffApiUser };
  saveStaffTokens(authData.access, authData.refresh);
  return { status: "authenticated", staff: mapApiStaff(authData.user) };
}

export type StaffLockoutStatus = {
  locked: boolean;
  lockedUntil?: string;
  secondsRemaining?: number;
  detail?: string;
};

export async function fetchStaffLockoutStatus(email: string): Promise<StaffLockoutStatus> {
  const trimmed = email.trim();
  if (!trimmed) return { locked: false };
  const params = new URLSearchParams({
    email: trimmed,
    device_fingerprint: getDeviceFingerprint(),
  });
  const data = await api<{
    locked?: boolean;
    locked_until?: string;
    seconds_remaining?: number;
    detail?: string;
  }>(`/api/admin/auth/login/lockout/?${params.toString()}`);
  return {
    locked: Boolean(data.locked),
    lockedUntil: data.locked_until,
    secondsRemaining: data.seconds_remaining,
    detail: data.detail,
  };
}

export async function staffApiVerifyLogin(staffId: string, code: string) {
  const data = await api<{ access: string; refresh: string; user: StaffApiUser }>(
    "/api/admin/auth/verify-email/",
    {
      method: "POST",
      body: JSON.stringify({
        staff_id: staffId,
        code,
        device_fingerprint: getDeviceFingerprint(),
      }),
    },
  );
  saveStaffTokens(data.access, data.refresh);
  return mapApiStaff(data.user);
}

export async function staffApiResendVerification(staffId: string) {
  return api<{ message: string; debug_code?: string }>("/api/admin/auth/resend-verification/", {
    method: "POST",
    body: JSON.stringify({
      staff_id: staffId,
      device_fingerprint: getDeviceFingerprint(),
    }),
  });
}

export async function restoreStaffApiSession() {
  if (!getStaffAccessToken() && !getStaffRefreshToken()) return null;
  const access = await ensureStaffAccessToken();
  try {
    return mapApiStaff(await api<StaffApiUser>("/api/admin/auth/me/", { token: access }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const next = await refreshStaffSession();
      return mapApiStaff(await api<StaffApiUser>("/api/admin/auth/me/", { token: next }));
    }
    throw err;
  }
}

export type ProviderApplication = {
  id: string;
  full_name: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  service_type: string;
  nagrita_uri?: string;
  nagrita_back_uri?: string;
  photo_uri?: string;
  nation_card_uri?: string;
  other_document_uri?: string;
  pending_photo_uri?: string;
  pending_nagrita_uri?: string;
  pending_nagrita_back_uri?: string;
  has_pending_edit?: boolean;
  pending_edit?: Record<string, string>;
  profile_data?: Record<string, string>;
  rejection_note?: string;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  owner_id?: string;
  owner_email?: string | null;
  owner_phone?: string | null;
  phone_verified?: boolean;
  email_verified?: boolean;
};

export async function listProviderApplicationsPage(query?: { page?: number; page_size?: number; status?: string; pending?: boolean }) {
  const params = new URLSearchParams();
  params.set("page", String(query?.page || 1));
  params.set("page_size", String(query?.page_size || 25));
  if (query?.status) params.set("status", query.status);
  if (query?.pending) params.set("pending", "1");
  const data = await staffRequest<ProviderApplication[] | StaffPage<ProviderApplication>>(
    `/api/admin/verification/applications/?${params.toString()}`,
  );
  return unwrapStaffPage(data, query?.page || 1, query?.page_size || 25);
}

export async function listProviderApplications(query?: { page?: number; page_size?: number; status?: string; pending?: boolean }) {
  return (await listProviderApplicationsPage(query)).results;
}

export async function patchProviderApplication(
  id: string,
  status: "pending" | "verified" | "rejected",
  rejection_note?: string,
  membership?: { membership_plan_id?: string | null; membership_fee_label?: string },
) {
  return staffRequest<ProviderApplication>(`/api/admin/verification/applications/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(status ? { status } : {}),
      ...(status === "rejected" ? { rejection_note: rejection_note || "" } : {}),
      ...membership,
    }),
  });
}

export async function fetchStaffImage(url: string) {
  if (!url) return "";
  // Public CDN URLs (e.g. Cloudinary) do not need staff auth.
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(url) || url.startsWith("blob:")) {
    return url;
  }
  const run = (token: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  try {
    const token = await ensureStaffAccessToken();
    let response = await run(token);
    if (response.status === 401) {
      const latest = getStaffAccessToken();
      const next =
        latest && latest !== token && accessTokenFresh(latest, 0) ? latest : await refreshStaffSession();
      response = await run(next);
    }
    if (!response.ok) return "";
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

export type AppDirectoryUser = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  account_type: "user" | "provider";
  phone_verified: boolean;
  email_verified: boolean;
  verification_status: "none" | "pending" | "verified" | "rejected";
  application_id?: string | null;
  service_type?: string | null;
  address?: string | null;
  date_joined: string;
  is_active: boolean;
  account_status?: "active" | "blocked" | "deactivated";
  staff_warning?: string;
  staff_warning_at?: string | null;
  listing_count?: number;
  photo_uri?: string | null;
  avatar_uri?: string | null;
  nagrita_uri?: string | null;
  nagrita_back_uri?: string | null;
  nation_card_uri?: string | null;
  other_document_uri?: string | null;
};

export type StaffPage<T> = {
  results: T[];
  page: number;
  page_size: number;
  count: number;
  has_next: boolean;
  counts?: {
    total: number;
    pending: number;
    approved?: number;
    rejected?: number;
    deactivated?: number;
    by_category?: Record<string, number>;
  };
};

function unwrapStaffPage<T>(data: T[] | StaffPage<T> | undefined, page = 1, pageSize = 25): StaffPage<T> {
  if (Array.isArray(data)) {
    return { results: data, page, page_size: pageSize, count: data.length, has_next: false };
  }
  const results = Array.isArray(data?.results) ? data.results : [];
  return {
    results,
    page: Number(data?.page) || page,
    page_size: Number(data?.page_size) || pageSize,
    count: Number(data?.count) || results.length,
    has_next: Boolean(data?.has_next),
    counts: data?.counts,
  };
}

export async function listAppUsersPage(query?: {
  page?: number;
  page_size?: number;
  q?: string;
  role?: "buyer" | "provider" | "user" | "seller";
  status?: "active" | "pending" | "verified" | "blocked" | "deactivated";
}) {
  const params = new URLSearchParams();
  params.set("page", String(query?.page || 1));
  params.set("page_size", String(query?.page_size || 25));
  if (query?.q?.trim()) params.set("q", query.q.trim());
  if (query?.role) params.set("role", query.role === "buyer" ? "buyer" : query.role === "provider" ? "provider" : query.role);
  if (query?.status) params.set("status", query.status);
  const data = await staffRequest<AppDirectoryUser[] | StaffPage<AppDirectoryUser>>(`/api/admin/users/?${params.toString()}`);
  return unwrapStaffPage(data, query?.page || 1, query?.page_size || 25);
}

export async function listAppUsers(query?: { page?: number; page_size?: number }) {
  return (await listAppUsersPage(query)).results;
}

export async function patchAppUser(
  id: string,
  body: { is_active?: boolean; status?: string; staff_warning?: string; notes?: string },
) {
  return staffRequest<AppDirectoryUser>(`/api/admin/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteAppUser(id: string) {
  return staffRequest<void>(`/api/admin/users/${id}/`, { method: "DELETE" });
}

export type StaffListing = {
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
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_via: string;
  extras?: Record<string, string | number | boolean | string[]>;
  pending_edit?: Record<string, unknown>;
  has_pending_edit?: boolean;
  view_count?: number;
  save_count?: number;
  comment_count?: number;
  review_count?: number;
  promote_requested: boolean;
  is_promoted: boolean;
  is_urgent?: boolean;
  urgent_ends_at?: string | null;
  admin_reason: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
  photos: { id: string; url: string }[];
  owner_name: string;
  owner_id: string;
};

export async function listStaffListingsPage(query?: {
  category?: string;
  status?: string;
  owner?: string;
  urgent?: boolean;
  page?: number;
  page_size?: number;
}) {
  const params = new URLSearchParams();
  if (query?.category) params.set("category", query.category);
  if (query?.status) params.set("status", query.status);
  if (query?.owner) params.set("owner", query.owner);
  if (query?.urgent) params.set("urgent", "1");
  params.set("page", String(query?.page || 1));
  params.set("page_size", String(query?.page_size || 20));
  const data = await staffRequest<StaffListing[] | StaffPage<StaffListing>>(`/api/admin/listings/?${params.toString()}`);
  return unwrapStaffPage(data, query?.page || 1, query?.page_size || 20);
}

export async function listStaffListings(query?: {
  category?: string;
  status?: string;
  owner?: string;
  urgent?: boolean;
  page?: number;
  page_size?: number;
}) {
  return (await listStaffListingsPage(query)).results;
}

export async function patchStaffListing(
  id: string,
  status: "approved" | "rejected" | "deactivated",
  reason?: string,
) {
  return staffRequest<StaffListing>(`/api/admin/listings/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason: reason || "" }),
  });
}

export async function deleteStaffListing(id: string) {
  return staffRequest<void>(`/api/admin/listings/${id}/`, { method: "DELETE" });
}

export async function listUrgentStaffListings() {
  return staffRequest<StaffListing[]>("/api/admin/listings/urgent/");
}

export async function setStaffListingUrgent(
  id: string,
  payload: { duration_hours?: number; duration_days?: number },
) {
  return staffRequest<StaffListing>(`/api/admin/listings/${id}/urgent/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeStaffListingUrgent(id: string) {
  return staffRequest<StaffListing>(`/api/admin/listings/${id}/urgent/`, {
    method: "POST",
    body: JSON.stringify({ remove: true }),
  });
}

export async function listPromoteStaffListings() {
  return staffRequest<StaffListing[]>("/api/admin/listings/promote/");
}

export async function setStaffListingPromote(id: string) {
  return staffRequest<StaffListing>(`/api/admin/listings/${id}/promote/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function removeStaffListingPromote(id: string) {
  return staffRequest<StaffListing>(`/api/admin/listings/${id}/promote/`, {
    method: "POST",
    body: JSON.stringify({ remove: true }),
  });
}

export type ProviderPlan = {
  id: string;
  name: string;
  price_label: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listProviderPlans() {
  return staffRequest<ProviderPlan[]>("/api/admin/app-control/provider-plans/");
}

export async function createProviderPlan(payload: {
  name: string;
  price_label: string;
  description?: string;
  sort_order?: number;
}) {
  return staffRequest<ProviderPlan>("/api/admin/app-control/provider-plans/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchProviderPlan(id: string, payload: Partial<ProviderPlan>) {
  return staffRequest<ProviderPlan>(`/api/admin/app-control/provider-plans/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProviderPlan(id: string) {
  return staffRequest<void>(`/api/admin/app-control/provider-plans/${id}/`, { method: "DELETE" });
}

export type ProviderLedgerEntry = {
  id: string;
  provider_id: string;
  provider_name: string;
  kind: "refund" | "promotion" | "plan" | "other";
  title: string;
  amount_label: string;
  note: string;
  created_at: string;
  created_by?: string | null;
};

export async function listProviderLedger(providerId?: string) {
  const q = providerId ? `?provider=${encodeURIComponent(providerId)}` : "";
  return staffRequest<ProviderLedgerEntry[]>(`/api/admin/app-control/provider-ledger/${q}`);
}

export async function createProviderLedgerEntry(payload: {
  provider_id: string;
  kind: ProviderLedgerEntry["kind"];
  title: string;
  amount_label?: string;
  note?: string;
}) {
  return staffRequest<ProviderLedgerEntry>("/api/admin/app-control/provider-ledger/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ReferEarnConfig = {
  is_active: boolean;
  reward_amount: number;
  reward_label: string;
  description: string;
};

export async function getReferEarnConfig(audience: "provider" | "user" = "provider") {
  const q = audience === "user" ? "?audience=buyer" : "?audience=seller";
  return staffRequest<ReferEarnConfig>(`/api/admin/app-control/refer-earn/${q}`);
}

export async function patchReferEarnConfig(payload: Partial<ReferEarnConfig>, audience: "provider" | "user" = "provider") {
  const q = audience === "user" ? "?audience=buyer" : "?audience=seller";
  return staffRequest<ReferEarnConfig>(`/api/admin/app-control/refer-earn/${q}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type StaffReferralRow = {
  id: string;
  invite_code: string;
  status: "joined" | "earned";
  reward_amount: number;
  joined_at: string;
  earned_at?: string | null;
  referrer_id: string;
  referrer_name: string;
  referred_id: string;
  referred_name: string;
};

export async function listStaffReferrals(status?: "joined" | "earned", audience: "provider" | "user" = "provider") {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("audience", audience === "user" ? "buyer" : "seller");
  const q = params.toString();
  return staffRequest<StaffReferralRow[]>(`/api/admin/app-control/referrals?${q}`);
}

export type SellerPaymentConfig = {
  is_active: boolean;
  listing_fee_rupees: number;
  listing_fee_label: string;
  min_load_rupees: number;
  max_load_rupees: number;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  payment_instructions: string;
  qr_code_url: string;
};

export type StaffPaymentsSummary = {
  pending_load_count: number;
  seller_wallet_count: number;
  total_wallet_balance_paisa: number;
  total_wallet_balance_label: string;
  referral_earned_rupees: number;
  referral_earned_label: string;
  referral_credited_paisa: number;
  referral_credited_label: string;
  admin_credit_total_paisa: number;
  admin_credit_total_label: string;
  admin_credit_total_rupees: number;
  approved_load_total_paisa: number;
  approved_load_total_label: string;
  approved_load_total_rupees: number;
  total_revenue_paisa: number;
  total_revenue_label: string;
  total_revenue_rupees: number;
  revenue_period: string;
  wallet_revenue_series: { label: string; admin_v: number; load_v: number; v: number; admin_paisa: number; load_paisa: number }[];
  admin_credit_series: { label: string; v: number; amount_paisa: number }[];
  listing_fee_label: string;
  listing_fee_rupees: number;
};

export async function getStaffPaymentsSummary(revenuePeriod?: string, audience: "provider" | "user" = "provider") {
  const params = new URLSearchParams();
  if (revenuePeriod) params.set("revenue_period", revenuePeriod);
  params.set("audience", audience === "user" ? "buyer" : "seller");
  const suffix = params.toString();
  return staffRequest<StaffPaymentsSummary>(`/api/admin/app-control/payments-summary/?${suffix}`);
}

export async function getSellerPaymentConfig(audience: "provider" | "user" = "provider") {
  const q = audience === "user" ? "?audience=buyer" : "?audience=seller";
  return staffRequest<SellerPaymentConfig>(`/api/admin/app-control/seller-payments/${q}`);
}

export async function patchSellerPaymentConfig(payload: Record<string, unknown>, audience: "provider" | "user" = "provider") {
  const q = audience === "user" ? "?audience=buyer" : "?audience=seller";
  return staffRequest<SellerPaymentConfig>(`/api/admin/app-control/seller-payments/${q}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type SellerLoadRequestRow = {
  id: string;
  amount_paisa: number;
  amount_label: string;
  payment_reference: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string;
  proof_url: string;
  created_at: string;
  reviewed_at?: string | null;
  provider_id: string;
  provider_name: string;
  provider_phone: string;
};

export async function listStaffLoadRequestsPage(query?: {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  page_size?: number;
  audience?: "provider" | "user";
}) {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  params.set("audience", query?.audience === "user" ? "buyer" : "seller");
  params.set("page", String(query?.page || 1));
  params.set("page_size", String(query?.page_size || 25));
  const data = await staffRequest<SellerLoadRequestRow[] | StaffPage<SellerLoadRequestRow>>(
    `/api/admin/app-control/load-requests/?${params.toString()}`,
  );
  return unwrapStaffPage(data, query?.page || 1, query?.page_size || 25);
}

export async function listStaffLoadRequests(status?: "pending" | "approved" | "rejected", audience: "provider" | "user" = "provider") {
  return (await listStaffLoadRequestsPage(status ? { status, page_size: 100, audience } : { page_size: 100, audience })).results;
}

export async function approveStaffLoadRequest(id: string) {
  return staffRequest(`/api/admin/app-control/load-requests/${id}/approve/`, { method: "POST", body: "{}" });
}

export async function rejectStaffLoadRequest(id: string, admin_note: string) {
  return staffRequest(`/api/admin/app-control/load-requests/${id}/reject/`, {
    method: "POST",
    body: JSON.stringify({ admin_note }),
  });
}

export type SellerWalletRow = {
  provider_id: string;
  provider_name: string;
  provider_phone: string;
  balance_paisa: number;
  balance_label: string;
  updated_at: string;
};

export async function listStaffSellerWallets(providerId?: string, audience: "provider" | "user" = "provider") {
  const params = new URLSearchParams();
  if (providerId) params.set("provider", providerId);
  params.set("audience", audience === "user" ? "buyer" : "seller");
  const q = params.toString();
  return staffRequest<SellerWalletRow[]>(`/api/admin/app-control/seller-wallets${q ? `?${q}` : ""}`);
}

export async function staffAdjustSellerWallet(
  providerId: string,
  amount_rupees: number,
  note: string,
  audience: "provider" | "user" = "provider",
) {
  const q = audience === "user" ? "?audience=buyer" : "?audience=seller";
  return staffRequest(`/api/admin/app-control/seller-wallets/${providerId}/adjust/${q}`, {
    method: "POST",
    body: JSON.stringify({ amount_rupees, note }),
  });
}

export type SellerWalletDetail = {
  provider_id: string;
  provider_name: string;
  provider_phone: string;
  balance_paisa: number;
  balance_label: string;
  transactions: Array<{
    id: string;
    kind: string;
    amount_paisa: number;
    amount_label: string;
    balance_after_paisa: number;
    balance_after_label: string;
    listing_id?: string | null;
    listing_title?: string;
    note: string;
    created_at: string;
  }>;
  load_requests: SellerLoadRequestRow[];
};

export async function getStaffSellerWalletDetail(providerId: string, audience: "provider" | "user" = "provider") {
  const q = audience === "user" ? "?audience=buyer" : "?audience=seller";
  return staffRequest<SellerWalletDetail>(`/api/admin/app-control/seller-wallets/${providerId}/${q}`);
}

export type ChatReportParty = {
  id: string;
  full_name: string;
  account_type: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  date_joined?: string | null;
};

export type ChatReportTicket = {
  id: string;
  status: string;
  reason: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
  thread_id: string;
  listing: { id?: string | null; title?: string; price?: string; location?: string; contact_phone?: string; contact_name?: string };
  reporter: ChatReportParty;
  accused: ChatReportParty;
  transcript: {
    id: string;
    sender_id: string;
    sender_name: string;
    kind: string;
    text: string;
    lat?: number | null;
    lng?: number | null;
    location_label?: string;
    created_at: string;
  }[];
  live_messages?: unknown[];
  reporter_active: boolean;
  accused_active: boolean;
};

export async function listChatReports() {
  return staffRequest<ChatReportTicket[]>("/api/admin/chat/reports/");
}

export async function fetchChatReport(id: string) {
  return staffRequest<ChatReportTicket>(`/api/admin/chat/reports/${id}/`);
}

export async function patchChatReport(
  id: string,
  body: { status?: string; admin_note?: string; action?: string },
) {
  return staffRequest<ChatReportTicket>(`/api/admin/chat/reports/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type ComplaintParty = {
  id?: string;
  full_name?: string;
  account_type?: string;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  account_status?: string;
  staff_warning?: string;
  staff_warning_at?: string | null;
};

export type ComplaintTicket = {
  id: string;
  kind: "user" | "listing" | "chat" | string;
  severity: "normal" | "high" | string;
  status: string;
  reason: string;
  reporter: ComplaintParty;
  accused: ComplaintParty;
  listing: {
    id?: string | null;
    title?: string;
    price?: string;
    location?: string;
    owner_id?: string | null;
    status?: string;
  };
  chat_thread_id?: string | null;
  chat_report_id?: string | null;
  transcript: {
    id: string;
    sender_id: string;
    sender_name: string;
    kind: string;
    text: string;
    created_at: string;
  }[];
  listing_snapshot?: Record<string, unknown>;
  reporter_snapshot?: ComplaintParty;
  accused_snapshot?: ComplaintParty;
  admin_note: string;
  warning_sent_to: string;
  warning_message: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
};

export async function listComplaints(params?: { status?: string; severity?: string; kind?: string; page?: number; page_size?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.kind) qs.set("kind", params.kind);
  qs.set("page", String(params?.page || 1));
  qs.set("page_size", String(params?.page_size || 25));
  const suffix = qs.toString() ? `?${qs}` : "";
  const data = await staffRequest<ComplaintTicket[] | StaffPage<ComplaintTicket>>(`/api/admin/reports/${suffix}`);
  return unwrapStaffPage(data, params?.page || 1, params?.page_size || 25);
}

export async function listComplaintsRows(params?: { status?: string; severity?: string; kind?: string; page?: number; page_size?: number }) {
  return (await listComplaints(params)).results;
}

export async function fetchComplaint(id: string) {
  return staffRequest<ComplaintTicket>(`/api/admin/reports/${id}/`);
}

export async function patchComplaint(
  id: string,
  body: {
    status?: string;
    admin_note?: string;
    action?: string;
    warning_message?: string;
    warning_note?: string;
  },
) {
  return staffRequest<ComplaintTicket>(`/api/admin/reports/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type AppNotice = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "buyer" | "provider";
  audience_label: string;
  image_uri?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listAppNotices() {
  return staffRequest<AppNotice[]>("/api/admin/notices/");
}

export async function createAppNotice(payload: {
  title: string;
  body?: string;
  audience: "all" | "buyer" | "provider";
  image_uri?: string;
}) {
  return staffRequest<AppNotice>("/api/admin/notices/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setAppNoticeActive(id: string, is_active: boolean) {
  return staffRequest<AppNotice>(`/api/admin/notices/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export async function deleteAppNotice(id: string) {
  return staffRequest<void>(`/api/admin/notices/${id}/`, { method: "DELETE" });
}

export type ProviderIdCard = {
  id: string;
  card_code: string;
  access_status: "blocked" | "requested" | "approved";
  can_download: boolean;
  requested_at?: string | null;
  approved_at?: string | null;
  staff_note?: string;
  full_name: string;
  role_label: string;
  category: string;
  phone: string;
  email: string;
  joined_on?: string | null;
  kyc_status: string;
  is_verified: boolean;
  photo_uri?: string | null;
  verify_url: string;
  qr_uri?: string | null;
  public_qr_uri?: string | null;
  signature_uri?: string | null;
  emergency_phone?: string;
  emergency_email?: string;
  website?: string;
  branding_updated_at?: string | null;
  membership_fee_label?: string;
  created_at: string;
  owner_id: string;
  owner_name: string;
  address?: string;
  contact?: string;
  application_id?: string | null;
  profile_data?: Record<string, unknown>;
  rejection_note?: string;
  phone_verified?: boolean;
  email_verified?: boolean;
  owner_phone?: string;
  owner_email?: string;
  account_status?: string;
};

export async function listProviderIdCards(status?: string) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  return staffRequest<ProviderIdCard[]>(`/api/admin/verification/cards/${suffix}`);
}

export async function patchProviderIdCard(
  id: string,
  action: "approve" | "revoke" | "block" | "unblock",
  note?: string,
) {
  return staffRequest<ProviderIdCard>(`/api/admin/verification/cards/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ action: action === "unblock" ? "approve" : action, note: note || "" }),
  });
}

export type BrandingConfig = {
  signatory_uri?: string | null;
  emergency_phone?: string;
  emergency_email?: string;
  website?: string;
  updated_at?: string;
};

export async function fetchBranding() {
  return staffRequest<BrandingConfig>("/api/branding/admin/");
}

export async function updateBranding(payload: {
  signatory_uri?: string;
  emergency_phone?: string;
  emergency_email?: string;
  website?: string;
}) {
  return staffRequest<BrandingConfig>("/api/branding/admin/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type SystemStatusCheck = {
  id: string;
  label: string;
  ok: boolean;
  status: string;
  detail: string;
  href?: string;
};

export type SystemStatus = {
  overall: "operational" | "attention" | "problems";
  label: string;
  checked_at: string;
  problem_count: number;
  attention_count?: number;
  checks: SystemStatusCheck[];
  counts?: Record<string, number>;
};

export async function fetchSystemStatus() {
  return staffRequest<SystemStatus>("/api/health/status/");
}

/** @deprecated use updateBranding */
export async function uploadSignatory(image_uri: string) {
  return updateBranding({ signatory_uri: image_uri });
}

export type HomeBannerSlide = {
  id: string;
  image_url: string;
  audience: "all" | "buyer" | "provider";
  audience_label?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function listHomeBannerSlides() {
  return staffRequest<HomeBannerSlide[]>("/api/admin/app-control/home-banners/");
}

export async function createHomeBannerSlide(payload: {
  image_uri: string;
  audience: "all" | "buyer" | "provider";
  sort_order?: number;
}) {
  return staffRequest<HomeBannerSlide>("/api/admin/app-control/home-banners/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchHomeBannerSlide(
  id: string,
  payload: Partial<{ image_uri: string; audience: "all" | "buyer" | "provider"; sort_order: number; is_active: boolean }>,
) {
  return staffRequest<HomeBannerSlide>(`/api/admin/app-control/home-banners/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteHomeBannerSlide(id: string) {
  return staffRequest<void>(`/api/admin/app-control/home-banners/${id}/`, { method: "DELETE" });
}

export type EngagementSummary = {
  comment_count: number;
  review_count: number;
  comment_hidden: number;
  review_hidden: number;
  rating_avg: number;
  five_star: number;
};

export type EngagementRow = {
  id: string;
  kind: "comment" | "review";
  listing_id: string;
  listing_title: string;
  listing_owner_id: string;
  listing_owner_name: string;
  listing_city: string;
  author_id: string;
  author_name: string;
  rating: number | null;
  text: string;
  created_at: string;
  is_hidden: boolean;
};

export async function getEngagementSummary() {
  return staffRequest<EngagementSummary>("/api/admin/listings/engagement/summary/");
}

export async function listEngagement(params?: { kind?: "all" | "comment" | "review"; listing?: string; hidden?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.kind && params.kind !== "all") qs.set("kind", params.kind);
  if (params?.listing) qs.set("listing", params.listing);
  if (params?.hidden) qs.set("hidden", "1");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return staffRequest<EngagementRow[]>(`/api/admin/listings/engagement/${suffix}`);
}

export async function patchEngagementComment(id: string, action: "hide" | "show" | "delete") {
  return staffRequest<{ id: string; is_hidden: boolean }>(`/api/admin/listings/comments/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export async function patchEngagementReview(id: string, action: "hide" | "show" | "delete") {
  return staffRequest<{ id: string; is_hidden: boolean }>(`/api/admin/listings/seller-reviews/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export type BoostPricing = {
  boost_3d_rupees: number;
  boost_7d_rupees: number;
  boost_14d_rupees: number;
  boost_30d_rupees: number;
  max_active_boosts_per_seller: number;
  max_active_boosts_per_category: number;
  max_active_boosts_platform: number;
  rotation_interval_minutes: number;
  max_slots_per_category_feed: number;
  seller_view_multiplier: number;
  is_active: boolean;
  packages?: {
    days: number;
    price_rupees: number;
    price_label: string;
    est_views: number;
    est_inquiries: number;
  }[];
};

export type BoostCampaignRow = {
  id: string;
  listing_title: string;
  listing_category: string;
  seller_name: string;
  seller_id: string;
  status: string;
  duration_days: number;
  price_paid_label: string;
  days_remaining: number;
  hours_remaining: number;
  impression_count: number;
  view_count: number;
  inquiry_count: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export async function getBoostPricing() {
  return staffRequest<BoostPricing>("/api/admin/ads/boost-pricing/");
}

export async function patchBoostPricing(payload: Partial<BoostPricing>) {
  return staffRequest<BoostPricing>("/api/admin/ads/boost-pricing/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listBoostCampaigns(status: "active" | "all" | "paused" | "expired" | "cancelled" = "all") {
  const suffix = status && status !== "all" ? `?status=${status}` : "";
  return staffRequest<BoostCampaignRow[]>(`/api/admin/ads/boost-campaigns/${suffix}`);
}

export async function controlBoostCampaign(id: string, action: string, hours?: number) {
  return staffRequest(`/api/admin/ads/boost-campaigns/${id}/`, {
    method: "POST",
    body: JSON.stringify({ action, hours }),
  });
}

export type StaffBooking = {
  id: string;
  listing: string;
  listing_title: string;
  listing_owner_name: string;
  listing_owner_id: string;
  requester: string;
  requester_name: string;
  recipient: string;
  recipient_name: string;
  scheduled_at: string;
  location: string;
  city: string;
  item: string;
  contact_name: string;
  contact_phone: string;
  note: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
};

export async function listStaffBookings(status?: string) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  return staffRequest<StaffBooking[]>(`/api/admin/listings/bookings/${suffix}`);
}

// ====== RBAC Staff Management ======

export type StaffRole = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_system_role: boolean;
  permissions?: Permission[];
  permission_ids?: string[];
  staff_count?: number;
  created_at?: string;
};

export type Permission = {
  id: string;
  code: string;
  page: string;
  page_display: string;
  action: string;
  action_display: string;
  description: string;
};

export type PermissionGroup = {
  page: string;
  page_display: string;
  permissions: Permission[];
};

export type StaffMember = {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole | null;
  is_super_admin: boolean;
  must_change_password: boolean;
  date_joined: string;
  last_login: string | null;
  is_active: boolean;
  is_locked: boolean;
  permissions: string[];
};

export async function listStaffMembers() {
  const data = await staffRequest<{ staff: StaffMember[] }>("/api/admin/auth/staff/");
  return data.staff;
}

export async function createStaffMember(payload: {
  email: string;
  full_name: string;
  password: string;
  role_id?: string;
  is_super_admin?: boolean;
}) {
  return staffRequest<StaffMember>("/api/admin/auth/staff/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getStaffMember(staffId: string) {
  return staffRequest<StaffMember>(`/api/admin/auth/staff/${staffId}/`);
}

export async function updateStaffMember(staffId: string, payload: {
  email?: string;
  full_name?: string;
  role_id?: string | null;
  is_active?: boolean;
  is_super_admin?: boolean;
}) {
  return staffRequest<StaffMember>(`/api/admin/auth/staff/${staffId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStaffMember(staffId: string) {
  return staffRequest(`/api/admin/auth/staff/${staffId}/`, {
    method: "DELETE",
  });
}

export async function resetStaffPassword(staffId: string, newPassword: string) {
  return staffRequest(`/api/admin/auth/staff/${staffId}/reset-password/`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export async function listRoles() {
  return staffRequest<StaffRole[]>("/api/admin/auth/roles/");
}

export async function createRole(payload: {
  name: string;
  description: string;
  permission_ids: string[];
}) {
  return staffRequest<StaffRole>("/api/admin/auth/roles/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRole(roleId: string) {
  return staffRequest<StaffRole>(`/api/admin/auth/roles/${roleId}/`);
}

export async function updateRole(roleId: string, payload: {
  name?: string;
  description?: string;
  permission_ids?: string[];
  is_active?: boolean;
}) {
  return staffRequest<StaffRole>(`/api/admin/auth/roles/${roleId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteRole(roleId: string) {
  return staffRequest(`/api/admin/auth/roles/${roleId}/`, {
    method: "DELETE",
  });
}

export async function listPermissions() {
  return staffRequest<{
    pages: PermissionGroup[];
    all_permissions: Permission[];
  }>("/api/admin/auth/permissions/");
}

export type PasswordStrength = {
  valid: boolean;
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export async function checkPasswordStrength(password: string) {
  return staffRequest<PasswordStrength>("/api/admin/auth/password/check-strength/", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function changeOwnPassword(payload: {
  current_password?: string;
  new_password: string;
  confirm_password: string;
}) {
  return staffRequest("/api/admin/auth/me/password/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
