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
  const payments = await fetchSellerPaymentsMe().catch(() => null);
  const walletPaisa = payments?.balance_paisa ?? 0;
  const referPaisa = payments?.refer_earn_remaining_paisa ?? payments?.refer_earn_total_paisa ?? 0;
  const loadedPaisa = payments?.loaded_balance_paisa ?? Math.max(0, walletPaisa - referPaisa);
  const referRupees = Math.floor(referPaisa / 100);
  const loadedRupees = Math.floor(loadedPaisa / 100);
  const combinedRupees = Math.floor(walletPaisa / 100);
  return {
    loaded_balance_paisa: loadedPaisa,
    loaded_balance_label: payments?.loaded_balance_label ?? formatRs(loadedRupees),
    referrer_balance_rupees: referRupees,
    referrer_balance_label: payments?.refer_earn_remaining_label ?? payments?.refer_earn_total_label ?? formatRs(referRupees),
    combined_balance_label: payments?.balance_label ?? formatRs(combinedRupees),
    listing_fee_label: payments?.config?.listing_fee_label ?? "—",
  };
}
