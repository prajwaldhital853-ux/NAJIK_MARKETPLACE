import { api, ApiError } from "./api";
import { getStaffAccessToken, getStaffRefreshToken, saveStaffTokens } from "./auth";
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
};

export function mapApiStaff(user: StaffApiUser): Staff {
  return {
    id: user.id,
    name: user.full_name || user.email,
    email: user.email,
    role: user.is_super_admin ? "Super Administrator" : "Staff",
    roleKey: user.is_super_admin ? "super" : "kyc",
    city: "—",
    status: "active",
    lastLogin: "Just now",
    password: "",
  };
}

export async function staffApiLogin(email: string, password: string) {
  const data = await api<{ access: string; refresh: string; user: StaffApiUser }>("/api/admin/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveStaffTokens(data.access, data.refresh);
  return mapApiStaff(data.user);
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

export async function listProviderApplications() {
  return staffRequest<ProviderApplication[]>("/api/admin/verification/applications/");
}

export async function patchProviderApplication(
  id: string,
  status: "pending" | "verified" | "rejected",
  rejection_note?: string,
) {
  return staffRequest<ProviderApplication>(`/api/admin/verification/applications/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      ...(status === "rejected" ? { rejection_note: rejection_note || "" } : {}),
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
  photo_uri?: string | null;
  avatar_uri?: string | null;
  nagrita_uri?: string | null;
  nagrita_back_uri?: string | null;
  nation_card_uri?: string | null;
  other_document_uri?: string | null;
};

export async function listAppUsers() {
  return staffRequest<AppDirectoryUser[]>("/api/admin/users/");
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
  admin_reason: string;
  reviewed_at?: string | null;
  created_at: string;
  photos: { id: string; url: string }[];
  owner_name: string;
  owner_id: string;
};

export async function listStaffListings(query?: { category?: string; status?: string }) {
  const params = new URLSearchParams();
  if (query?.category) params.set("category", query.category);
  if (query?.status) params.set("status", query.status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return staffRequest<StaffListing[]>(`/api/admin/listings/${suffix}`);
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

export async function listComplaints(params?: { status?: string; severity?: string; kind?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.kind) qs.set("kind", params.kind);
  const suffix = qs.toString() ? `?${qs}` : "";
  return staffRequest<ComplaintTicket[]>(`/api/admin/reports/${suffix}`);
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
  checks: SystemStatusCheck[];
  counts: Record<string, number>;
};

export async function fetchSystemStatus() {
  return staffRequest<SystemStatus>("/api/health/status/");
}

/** @deprecated use updateBranding */
export async function uploadSignatory(image_uri: string) {
  return updateBranding({ signatory_uri: image_uri });
}
