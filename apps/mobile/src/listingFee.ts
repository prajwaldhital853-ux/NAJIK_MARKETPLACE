import type { ListingFeeTier, SellerPaymentConfig } from "./paymentsApi";

export function quoteListingFeeRupees(priceRupees: number, config?: SellerPaymentConfig | null) {
  if (!config || config.is_active === false) return 0;
  const price = Math.max(0, Math.floor(Number(priceRupees) || 0));
  const tiers = [...(config.listing_fee_tiers || [])].sort((a, b) => a.min_rupees - b.min_rupees);
  for (const row of tiers) {
    const top = row.max_rupees;
    if (price >= row.min_rupees && (top == null || top <= 0 || price <= top)) {
      return Math.max(0, Number(row.fee_rupees) || 0);
    }
  }
  return Math.max(0, Number(config.listing_fee_rupees) || 0);
}

export function minListingFeeRupees(config?: SellerPaymentConfig | null) {
  if (!config || config.is_active === false) return 0;
  const fromTiers = (config.listing_fee_tiers || [])
    .map((row) => Math.max(0, Number(row.fee_rupees) || 0))
    .filter((n) => n > 0);
  if (fromTiers.length) return Math.min(...fromTiers);
  return Math.max(0, Number(config.listing_fee_rupees) || 0);
}
  const min = `Rs. ${Number(row.min_rupees || 0).toLocaleString("en-IN")}`;
  const max = row.max_rupees == null || row.max_rupees <= 0 ? "and above" : `Rs. ${Number(row.max_rupees).toLocaleString("en-IN")}`;
  return `${min} – ${max}: Rs. ${Number(row.fee_rupees || 0).toLocaleString("en-IN")}`;
}
