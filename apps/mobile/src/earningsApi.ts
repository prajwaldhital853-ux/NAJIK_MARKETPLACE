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
  const walletPaisa = payments?.balance_paisa ?? 0;
  const referPaisa = payments?.refer_earn_total_paisa ?? 0;
  const referFromApi = refer?.stats?.earned_total ?? 0;
  const referRupees = referPaisa > 0 ? Math.floor(referPaisa / 100) : referFromApi;
  const loadedPaisa = Math.max(0, walletPaisa - referPaisa);
  const loadedRupees = Math.floor(loadedPaisa / 100);
  const combinedRupees = loadedRupees + referRupees;
  return {
    loaded_balance_paisa: loadedPaisa,
    loaded_balance_label: formatRs(loadedRupees),
    referrer_balance_rupees: referRupees,
    referrer_balance_label: referPaisa > 0 ? payments?.refer_earn_total_label ?? formatRs(referRupees) : refer?.stats?.earned_total_label ?? formatRs(referRupees),
    combined_balance_label: formatRs(combinedRupees),
    listing_fee_label: payments?.config?.listing_fee_label ?? "—",
  };
}
