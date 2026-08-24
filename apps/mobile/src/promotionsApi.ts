import { api } from "./api";
import { withAppAuth } from "./authApi";

export type BoostPackage = {
  days: number;
  price_rupees: number;
  price_label: string;
  est_views: number;
  est_inquiries: number;
};

export type BoostPricing = {
  boost_3d_rupees: number;
  boost_7d_rupees: number;
  boost_14d_rupees: number;
  boost_30d_rupees: number;
  max_active_boosts_per_seller: number;
  seller_view_multiplier: number;
  is_active: boolean;
  packages: BoostPackage[];
};

export type BoostCampaign = {
  id: string;
  listing: string;
  listing_title: string;
  listing_category: string;
  status: string;
  duration_days: number;
  price_paid_paisa: number;
  price_paid_label: string;
  starts_at: string;
  ends_at: string;
  days_remaining: number;
  hours_remaining: number;
  impression_count: number;
  view_count: number;
  display_view_count: number;
  inquiry_count: number;
  is_paused?: boolean;
  paused_at?: string | null;
  created_at: string;
};

export async function fetchBoostPricing() {
  return withAppAuth((token) => api<BoostPricing>("/api/promotions/boost-pricing/", { token }));
}

export async function fetchMyBoostCampaigns(status: "active" | "all" | "expired" | "cancelled" = "all") {
  return withAppAuth((token) =>
    api<BoostCampaign[]>(`/api/promotions/boost-campaigns/?status=${status}`, { token }),
  );
}

export async function createBoostCampaign(listingId: string, durationDays: number) {
  return withAppAuth((token) =>
    api<BoostCampaign>("/api/promotions/boost-campaigns/create/", {
      method: "POST",
      token,
      body: JSON.stringify({ listing_id: listingId, duration_days: durationDays }),
    }),
  );
}

export async function controlBoostCampaign(campaignId: string, action: "pause" | "resume") {
  return withAppAuth((token) =>
    api<BoostCampaign>(`/api/promotions/boost-campaigns/${campaignId}/`, {
      method: "POST",
      token,
      body: JSON.stringify({ action }),
    }),
  );
}
