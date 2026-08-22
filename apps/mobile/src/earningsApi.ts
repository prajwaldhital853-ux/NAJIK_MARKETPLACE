import { fetchReferEarnMe } from "./referralsApi";
import { fetchSellerPaymentsMe } from "./paymentsApi";

function formatRs(rupees: number) {
  return `Rs. ${Math.max(0, Math.round(rupees)).toLocaleString("en-IN")}`;
}

export type SellerEarningsSummary = {
  loaded_balance_paisa: number;
  loaded_balance_label: string;
  referrer_balance_rupees: number;
  referrer_balance_label: string;
  combined_balance_label: string;
  listing_fee_label: string;
};

export async function fetchSellerEarningsSummary(): Promise<SellerEarningsSummary> {
  const [payments, refer] = await Promise.all([
    fetchSellerPaymentsMe().catch(() => null),
    fetchReferEarnMe().catch(() => null),
  ]);
  const loadedPaisa = payments?.balance_paisa ?? 0;
  const loadedRupees = Math.floor(loadedPaisa / 100);
  const referrerRupees = refer?.stats?.earned_total ?? 0;
  return {
    loaded_balance_paisa: loadedPaisa,
    loaded_balance_label: payments?.balance_label ?? formatRs(0),
    referrer_balance_rupees: referrerRupees,
    referrer_balance_label: refer?.stats?.earned_total_label ?? formatRs(0),
    combined_balance_label: formatRs(loadedRupees + referrerRupees),
    listing_fee_label: payments?.config?.listing_fee_label ?? "—",
  };
}
