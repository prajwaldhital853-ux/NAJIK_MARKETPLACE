import { api } from "./api";
import { withAppAuth } from "./authApi";
import { API_URL } from "./config";

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

export type SellerWalletTransaction = {
  id: string;
  kind: string;
  kind_label?: string;
  amount_paisa: number;
  amount_label: string;
  balance_after_paisa: number;
  balance_after_label: string;
  listing_id?: string | null;
  listing_title?: string;
  note: string;
  created_at: string;
};

export type SellerLoadRequest = {
  id: string;
  amount_paisa: number;
  amount_label: string;
  payment_reference: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string;
  proof_url?: string;
  created_at: string;
  reviewed_at?: string | null;
};

export type SellerPaymentsMe = {
  balance_paisa: number;
  balance_label: string;
  loaded_balance_paisa?: number;
  loaded_balance_label?: string;
  refer_earn_total_paisa?: number;
  refer_earn_total_label?: string;
  refer_earn_remaining_paisa?: number;
  refer_earn_remaining_label?: string;
  config: SellerPaymentConfig;
  pending_load: SellerLoadRequest | null;
  can_request_load: boolean;
  transactions: SellerWalletTransaction[];
  recent_load_requests: SellerLoadRequest[];
};

export async function fetchSellerPaymentsMe() {
  return withAppAuth((token) => api<SellerPaymentsMe>("/api/auth/payments/me/", { token }));
}

export async function createSellerLoadRequest(payload: {
  amount_rupees: number;
  payment_reference?: string;
  proof_uri?: string;
}) {
  return withAppAuth((token) =>
    api<SellerLoadRequest>("/api/auth/payments/load-requests/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
}

/** Resolve payment QR / public asset URLs (handles relative API paths). */
export function resolvePaymentAssetUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const base = API_URL.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}
