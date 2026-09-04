import type { CatalogItem, CatalogKey } from "./catalog";
import type { ApiListing } from "../listingsApi";
import { MARKETPLACE_ELECTRONICS } from "./listingVertical";

const CATEGORY_TO_KEY: Record<string, CatalogKey> = {
  property: "property",
  vehicles: "vehicles",
  jobs: "jobs",
  services: "services",
  marketplace: "used",
  business: "shops",
  nearby: "others",
};

const KEY_TO_CATEGORY: Partial<Record<CatalogKey, string>> = {
  property: "property",
  vehicles: "vehicles",
  jobs: "jobs",
  services: "services",
  used: "marketplace",
  electronics: "marketplace",
  shops: "business",
  others: "nearby",
};

const liveById = new Map<string, CatalogItem>();

export function uniqueLabels(values: Array<string | number | null | undefined | false>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function catalogKeyForCategory(category: string, subcategory?: string): CatalogKey {
  if (category === "marketplace") {
    if (subcategory && MARKETPLACE_ELECTRONICS.includes(subcategory)) return "electronics";
    return "used";
  }
  return CATEGORY_TO_KEY[category] ?? "others";
}

export function apiCategoryForKey(key: CatalogKey) {
  return KEY_TO_CATEGORY[key];
}

export function rememberLiveListing(item: CatalogItem) {
  liveById.set(item.id, item);
}

export function liveListingById(id: string) {
  return liveById.get(id);
}

export function formatListingPrice(price: string, negotiable?: boolean) {
  const digits = String(price || "").replace(/[^\d]/g, "");
  const amount = digits ? `Rs. ${Number(digits).toLocaleString("en-IN")}` : negotiable ? "Negotiable" : "Price on request";
  return digits && negotiable ? `${amount} (nego.)` : amount;
}

export function listingDiscountPercent(extras?: Record<string, unknown> | null) {
  const raw = extras?.discountPercent ?? extras?.discount_percent ?? extras?.discount;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 90) return 0;
  return Math.round(n);
}

export function discountedAmount(price: string, percent: number) {
  const digits = String(price || "").replace(/[^\d]/g, "");
  if (!digits || percent <= 0) return "";
  const sale = Math.max(0, Math.round(Number(digits) * (100 - percent) / 100));
  return `Rs. ${sale.toLocaleString("en-IN")}`;
}

export function listingToCatalog(row: ApiListing): CatalogItem {
  const features = Array.isArray(row.extras?.features) ? (row.extras.features as string[]) : [];
  const extras = row.extras || {};
  const condition = String(extras.condition || extras.dealType || "");
  const percent = listingDiscountPercent(extras);
  const sale = discountedAmount(row.price, percent);
  const item: CatalogItem = {
    id: row.id,
    key: catalogKeyForCategory(row.category, row.subcategory),
    title: row.title,
    price: sale || formatListingPrice(row.price, row.negotiable),
    originalPrice: percent && sale ? formatListingPrice(row.price, false) : undefined,
    discountPercent: percent || undefined,
    location: row.location,
    time: row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Just now",
    badge: row.status === "approved" ? "VERIFIED" : "PENDING",
    extra: uniqueLabels([row.subcategory, condition, ...features]).slice(0, 3),
    tags: uniqueLabels([row.subcategory, condition, row.negotiable ? "Negotiable" : ""]),
    company: row.owner_name,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating_avg || 0,
    reviewCount: row.review_count || 0,
    viewCount: row.view_count || 0,
    verified: Boolean(row.seller_verified),
    available: Boolean(extras.availability),
    sold: extras.sold === true || String(extras.sold || "") === "true",
    soldCount: Number(extras.sold_count) > 0 ? Math.floor(Number(extras.sold_count)) : undefined,
    urgent: Boolean(row.is_urgent),
    urgentEndsAt: row.urgent_ends_at || undefined,
    apiCategory: row.category,
    promoted: Boolean(row.is_promoted || row.is_boosted),
  };
  if (row.photos[0]?.url) item.photo = { uri: row.photos[0].url };
  rememberLiveListing(item);
  return item;
}

export function liveSpecs(row: ApiListing) {
  const extras = row.extras || {};
  const rows: { label: string; value: string }[] = [
    { label: "Type", value: row.subcategory },
    extras.dealType ? { label: "Kind", value: String(extras.dealType) } : null,
    extras.condition ? { label: "Condition", value: String(extras.condition) } : null,
    extras.company ? { label: "Company", value: String(extras.company) } : null,
    extras.workplace ? { label: "Workplace", value: String(extras.workplace) } : null,
    extras.experience ? { label: "Experience", value: String(extras.experience) } : null,
    extras.applyEmail ? { label: "Apply email", value: String(extras.applyEmail) } : null,
    extras.make ? { label: "Make", value: String(extras.make) } : null,
    extras.model ? { label: "Model", value: String(extras.model) } : null,
    extras.year ? { label: "Year", value: String(extras.year) } : null,
    extras.km ? { label: "Kilometers", value: String(extras.km) } : null,
    extras.fuel ? { label: "Fuel", value: String(extras.fuel) } : null,
    extras.rateType ? { label: "Rate type", value: String(extras.rateType) } : null,
    extras.availability ? { label: "Availability", value: String(extras.availability) } : null,
    extras.beds ? { label: "Bedrooms", value: String(extras.beds) } : null,
    extras.baths ? { label: "Bathrooms", value: String(extras.baths) } : null,
    extras.kitchens ? { label: "Kitchens", value: String(extras.kitchens) } : null,
    extras.area ? { label: "Area", value: `${extras.area} sqft` } : null,
    extras.furnished !== undefined && extras.furnished !== "" ? { label: "Furnished", value: extras.furnished ? "Yes" : "No" } : null,
    extras.parking !== undefined && extras.parking !== "" ? { label: "Parking", value: extras.parking ? "Yes" : "No" } : null,
    extras.discountPercent ? { label: "Discount", value: `${extras.discountPercent}%` } : null,
    { label: "Price negotiable", value: row.negotiable ? "Yes" : "No" },
  ].filter(Boolean) as { label: string; value: string }[];
  return rows;
}

export function listingsToCatalog(rows: ApiListing[]) {
  return rows
    .filter((row) => row.extras?.sold !== true && String(row.extras?.sold || "") !== "true")
    .map(listingToCatalog);
}
