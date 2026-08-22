export type CatalogKey = "property" | "vehicles" | "jobs" | "services" | "shops" | "electronics" | "used" | "others";

export type CatalogIcon =
  | "home"
  | "car"
  | "briefcase"
  | "construct"
  | "storefront"
  | "phone-portrait"
  | "bed"
  | "grid";

export type CatalogItem = {
  id: string;
  key: CatalogKey;
  title: string;
  price: string;
  location: string;
  time: string;
  photo?: number | { uri: string };
  badge?: string;
  extra: string[];
  tags: string[];
  company?: string;
  lat?: number | null;
  lng?: number | null;
  rating?: number;
  reviewCount?: number;
  originalPrice?: string;
  discountPercent?: number;
  verified?: boolean;
  available?: boolean;
  distanceKm?: number;
  apiCategory?: string;
};

export const catalogMeta: Record<
  CatalogKey,
  {
    title: string;
    sub: string;
    icon: CatalogIcon;
    color: string;
    bg: string;
    filters: string[];
  }
> = {
  property: { title: "Property", sub: "Houses, land, flats near you", icon: "home", color: "#1B7D2C", bg: "#E4F6EA", filters: ["All", "For Sale", "For Rent", "House", "Land"] },
  vehicles: { title: "Vehicles", sub: "Cars, bikes and more", icon: "car", color: "#2563EB", bg: "#E8F1FE", filters: ["All", "Cars", "Bikes", "For Sale"] },
  jobs: { title: "Jobs", sub: "Work near Lahan", icon: "briefcase", color: "#EA580C", bg: "#FFF1E0", filters: ["All", "Full Time", "Part Time", "Remote"] },
  services: { title: "Services", sub: "Local help at your door", icon: "construct", color: "#7C3AED", bg: "#F1E9FF", filters: ["All", "Home", "Verified"] },
  shops: { title: "Shops", sub: "Stores and rentals", icon: "storefront", color: "#E53935", bg: "#FDECEC", filters: ["All", "Retail", "For Rent"] },
  electronics: { title: "Electronics", sub: "Phones, laptops and gadgets", icon: "phone-portrait", color: "#2563EB", bg: "#E8F1FE", filters: ["All", "New", "Used", "Electronics", "Phones", "Laptops", "Appliances"] },
  used: { title: "Used Items", sub: "Marketplace near you", icon: "bed", color: "#16A34A", bg: "#E7F6EC", filters: ["All", "New", "Used", "Electronics", "Furniture", "Phones", "Laptops", "Appliances", "Fashion", "Bikes", "Books", "Home items", "Other"] },
  others: { title: "Others", sub: "More local listings", icon: "grid", color: "#7C3AED", bg: "#F1E9FF", filters: ["All"] },
};

export const catalogItems: CatalogItem[] = [];

export function listingsFor(key: CatalogKey) {
  return catalogItems.filter((item) => item.key === key);
}

export function listingById(id: string) {
  return catalogItems.find((item) => item.id === id);
}

export function listingBlurb(item: CatalogItem) {
  return `${item.title} in ${item.location}. ${item.extra.join(" · ")}. Contact the seller on NAJIK to book a visit.`;
}

export function conditionLabel(item: CatalogItem) {
  const extra = item.extra.join(" ").toLowerCase();
  if (extra.includes("not working")) return "Not Working";
  if (item.tags.includes("For Rent")) return "For Rent";
  if (item.key === "jobs") return "Hiring";
  if (item.key === "used") return "Used";
  if (extra.includes("excellent") || extra.includes("new") || item.badge === "FEATURED") return "Brand New";
  if (item.badge === "VERIFIED") return "Used";
  return "Used";
}

export function sellerHandle(item: CatalogItem) {
  if (item.company) return item.company.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
  const names = ["homelandbazaar.com", "lahanads.com", "sirahamarket.com", "najiklocal.com"];
  return names[item.id.charCodeAt(item.id.length - 1) % names.length];
}

export function adsCount(_item: CatalogItem) {
  return 0;
}

export function sellerPhone() {
  return "";
}

export const nearbyCatalogId: Record<string, string> = {};

export const homeCategoryKey: Record<string, CatalogKey> = {
  Property: "property",
  Vehicles: "vehicles",
  Jobs: "jobs",
  Services: "services",
  "Used Items": "used",
  Shops: "shops",
  Electronics: "electronics",
  Others: "others",
};

export const exploreBrowseKey: Record<string, { key: CatalogKey; filter?: string }> = {
  houses: { key: "property", filter: "House" },
  apartments: { key: "property", filter: "House" },
  land: { key: "property", filter: "Land" },
  office: { key: "property" },
  cars: { key: "vehicles", filter: "Cars" },
  bikes: { key: "vehicles", filter: "Bikes" },
  jobs: { key: "jobs" },
  services: { key: "services" },
  shops: { key: "shops" },
  used: { key: "used" },
  electronics: { key: "electronics" },
};

export function priceValue(price: string) {
  return Number(price.replace(/[^\d]/g, "")) || 0;
}
