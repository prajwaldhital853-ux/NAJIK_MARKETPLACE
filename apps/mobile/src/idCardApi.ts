import { api } from "./api";
import { withAppAuth } from "./authApi";

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
  created_at: string;
};

export async function fetchMyIdCard() {
  return withAppAuth((token) => api<ProviderIdCard>("/api/cards/me/", { token }));
}

export async function requestIdCardDownload() {
  return withAppAuth((token) =>
    api<ProviderIdCard>("/api/cards/me/", {
      token,
      method: "POST",
      body: JSON.stringify({ action: "request_download" }),
    }),
  );
}
