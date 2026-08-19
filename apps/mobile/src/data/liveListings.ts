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

export function listingToCatalog(row: ApiListing): CatalogItem {
  const features = Array.isArray(row.extras?.features) ? (row.extras.features as string[]) : [];
  const extras = row.extras || {};
  const condition = String(extras.condition || extras.dealType || "");
  const item: CatalogItem = {
    id: row.id,
    key: catalogKeyForCategory(row.category, row.subcategory),
    title: row.title,
    price: formatListingPrice(row.price, row.negotiable),
    location: row.location,
    time: row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Just now",
    badge: row.is_promoted ? "FEATURED" : row.status === "approved" ? "VERIFIED" : "PENDING",
    extra: [row.subcategory, condition, ...features].filter(Boolean).slice(0, 3),
    tags: [row.subcategory, condition, row.negotiable ? "Negotiable" : ""].filter(Boolean),
    company: row.owner_name,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating_avg || 0,
    verified: Boolean(row.seller_verified),
    available: Boolean(extras.availability),
    apiCategory: row.category,
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
    { label: "Price negotiable", value: row.negotiable ? "Yes" : "No" },
  ].filter(Boolean) as { label: string; value: string }[];
  return rows;
}

export function listingsToCatalog(rows: ApiListing[]) {
  return rows.map(listingToCatalog);
}
