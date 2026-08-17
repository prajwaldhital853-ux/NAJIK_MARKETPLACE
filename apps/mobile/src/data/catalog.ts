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
  photo: number;
  badge?: string;
  extra: string[];
  tags: string[];
  company?: string;
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
  electronics: { title: "Electronics", sub: "Phones and gadgets", icon: "phone-portrait", color: "#2563EB", bg: "#E8F1FE", filters: ["All", "Phones", "Gadgets"] },
  used: { title: "Used Items", sub: "Buy and sell nearby", icon: "bed", color: "#16A34A", bg: "#E7F6EC", filters: ["All", "Furniture", "For Sale"] },
  others: { title: "Others", sub: "More local listings", icon: "grid", color: "#7C3AED", bg: "#F1E9FF", filters: ["All"] },
};

export const catalogItems: CatalogItem[] = [
  { id: "p1", key: "property", title: "3 BHK Modern House", price: "Rs. 25,00,000", location: "Lahan-3, Siraha", time: "2 min ago", photo: require("../../assets/listings/house.jpg"), badge: "FEATURED", extra: ["3 Beds", "2 Baths", "1,800 sqft"], tags: ["For Sale", "House"] },
  { id: "p2", key: "property", title: "2 BHK Flat for Rent", price: "Rs. 18,000 /mo", location: "Lahan-5, Siraha", time: "1 hour ago", photo: require("../../assets/listings/flat.jpg"), badge: "VERIFIED", extra: ["2 Beds", "1 Bath", "850 sqft"], tags: ["For Rent", "House"] },
  { id: "p3", key: "property", title: "Land for Sale", price: "Rs. 32,00,000", location: "Lahan-7, Siraha", time: "3 hours ago", photo: require("../../assets/listings/land.jpg"), extra: ["8 Katha"], tags: ["For Sale", "Land"] },
  { id: "p4", key: "property", title: "Apartment in Town", price: "Rs. 45,00,000", location: "Golbazar, Siraha", time: "Yesterday", photo: require("../../assets/listings/apartment.jpg"), badge: "FEATURED", extra: ["3 Beds", "2 Baths"], tags: ["For Sale", "House"] },
  { id: "p5", key: "property", title: "Shop Space for Rent", price: "Rs. 22,000 /mo", location: "Main Road, Lahan", time: "Yesterday", photo: require("../../assets/listings/shop.jpg"), extra: ["1 Floor", "700 sqft"], tags: ["For Rent"] },
  { id: "p6", key: "property", title: "Office Building", price: "Rs. 85,00,000", location: "Lahan Bazaar", time: "2 days ago", photo: require("../../assets/listings/building.jpg"), badge: "VERIFIED", extra: ["4 Floors"], tags: ["For Sale"] },
  { id: "p7", key: "property", title: "3 BHK Flat for Rent", price: "Rs. 25,000 /mo", location: "Lahan-3, Siraha", time: "2 min ago", photo: require("../../assets/listings/flat.jpg"), badge: "FEATURED", extra: ["3 Beds", "2 Baths", "1,100 sqft"], tags: ["For Rent", "House"] },
  { id: "p8", key: "property", title: "Villa with Garden", price: "Rs. 85,00,000", location: "Golbazar, Siraha", time: "Yesterday", photo: require("../../assets/listings/modern.jpg"), badge: "VERIFIED", extra: ["4 Beds", "Garden"], tags: ["For Sale", "House"] },
  { id: "p9", key: "property", title: "Office Space", price: "Rs. 35,000 /mo", location: "Lahan Bazaar", time: "2 days ago", photo: require("../../assets/listings/office.jpg"), extra: ["1,200 sqft", "Parking"], tags: ["For Rent"] },

  { id: "v1", key: "vehicles", title: "Hyundai Creta 2022", price: "Rs. 28,50,000", location: "Lahan-4, Siraha", time: "20 min ago", photo: require("../../assets/listings/car.jpg"), badge: "FEATURED", extra: ["Petrol", "Automatic", "18,000 km"], tags: ["Cars", "For Sale"] },
  { id: "v2", key: "vehicles", title: "Honda Civic 2018", price: "Rs. 32,00,000", location: "Lahan-2, Siraha", time: "2 hours ago", photo: require("../../assets/listings/car.jpg"), extra: ["Petrol", "Manual", "42,000 km"], tags: ["Cars", "For Sale"] },
  { id: "v3", key: "vehicles", title: "Pulsar 150 Bike", price: "Rs. 1,45,000", location: "Siraha Bazaar", time: "Yesterday", photo: require("../../assets/listings/bike.jpg"), extra: ["150 cc", "12,000 km"], tags: ["Bikes", "For Sale"] },
  { id: "v4", key: "vehicles", title: "Yamaha FZ-S", price: "Rs. 1,85,000", location: "Lahan-6, Siraha", time: "2 days ago", photo: require("../../assets/listings/bike.jpg"), badge: "VERIFIED", extra: ["149 cc", "8,400 km"], tags: ["Bikes", "For Sale"] },
  { id: "v5", key: "vehicles", title: "Tata Pickup", price: "Rs. 12,50,000", location: "Lahan, Siraha", time: "3 days ago", photo: require("../../assets/listings/car.jpg"), extra: ["Diesel", "2019"], tags: ["Cars", "For Sale"] },

  { id: "j1", key: "jobs", title: "Marketing Manager", price: "Rs. 45,000 /mo", location: "Lahan, Siraha", time: "30 min ago", photo: require("../../assets/listings/jobs.jpg"), badge: "FEATURED", extra: ["Full Time", "On-site"], tags: ["Full Time"], company: "WebTech Solutions" },
  { id: "j2", key: "jobs", title: "School Teacher", price: "Rs. 28,000 /mo", location: "Lahan-3, Siraha", time: "2 hours ago", photo: require("../../assets/listings/jobs.jpg"), extra: ["Full Time", "Morning"], tags: ["Full Time"], company: "Sunrise Academy" },
  { id: "j3", key: "jobs", title: "Graphic Designer", price: "Rs. 22,000 /mo", location: "Remote / Lahan", time: "Yesterday", photo: require("../../assets/listings/jobs.jpg"), extra: ["Part Time", "Remote"], tags: ["Part Time", "Remote"], company: "Pixel Studio" },
  { id: "j4", key: "jobs", title: "Store Cashier", price: "Rs. 18,000 /mo", location: "Main Road, Lahan", time: "2 days ago", photo: require("../../assets/listings/shop.jpg"), extra: ["Full Time"], tags: ["Full Time"], company: "Bazaar Mart" },
  { id: "j5", key: "jobs", title: "Content Writer", price: "Rs. 20,000 /mo", location: "Work from home", time: "3 days ago", photo: require("../../assets/listings/jobs.jpg"), badge: "VERIFIED", extra: ["Remote"], tags: ["Remote", "Part Time"], company: "NAJIK Media" },

  { id: "s1", key: "services", title: "Plumbing Service", price: "Rs. 1,500 /visit", location: "Lahan, Siraha", time: "15 min ago", photo: require("../../assets/listings/tools.jpg"), badge: "VERIFIED", extra: ["4.8 rating", "Same day"], tags: ["Home", "Verified"], company: "HomeFix" },
  { id: "s2", key: "services", title: "Home Cleaning", price: "Rs. 1,200 /visit", location: "Lahan-5, Siraha", time: "1 hour ago", photo: require("../../assets/listings/services.jpg"), extra: ["4.6 rating"], tags: ["Home"], company: "Sparkle Crew" },
  { id: "s3", key: "services", title: "Electric Repair", price: "Rs. 800 /visit", location: "Lahan Bazaar", time: "Yesterday", photo: require("../../assets/listings/tools.jpg"), badge: "VERIFIED", extra: ["Licensed"], tags: ["Home", "Verified"], company: "PowerPro" },
  { id: "s4", key: "services", title: "AC Installation", price: "Rs. 2,500", location: "Siraha", time: "2 days ago", photo: require("../../assets/listings/services.jpg"), extra: ["Warranty"], tags: ["Home"], company: "CoolAir" },

  { id: "sh1", key: "shops", title: "Kirana Store", price: "Open now", location: "Lahan-1, Siraha", time: "Just now", photo: require("../../assets/listings/shop.jpg"), extra: ["Groceries"], tags: ["Retail"], company: "Sah Store" },
  { id: "sh2", key: "shops", title: "Shop for Rent", price: "Rs. 15,000 /mo", location: "Main Road, Lahan", time: "4 hours ago", photo: require("../../assets/listings/shop.jpg"), badge: "FEATURED", extra: ["350 sqft"], tags: ["For Rent"] },
  { id: "sh3", key: "shops", title: "Mobile Repair Shop", price: "Open 8am–8pm", location: "Lahan Bazaar", time: "Yesterday", photo: require("../../assets/listings/phone.jpg"), extra: ["Walk-in"], tags: ["Retail"] },
  { id: "sh4", key: "shops", title: "Clothing Store", price: "Rs. 20,000 /mo", location: "Golbazar", time: "3 days ago", photo: require("../../assets/listings/shop.jpg"), extra: ["Corner unit"], tags: ["For Rent", "Retail"] },

  { id: "e1", key: "electronics", title: "iPhone 13 Pro", price: "Rs. 95,000", location: "Lahan-2, Siraha", time: "40 min ago", photo: require("../../assets/listings/phone.jpg"), badge: "FEATURED", extra: ["128 GB", "Excellent"], tags: ["Phones"] },
  { id: "e2", key: "electronics", title: "Samsung Galaxy A55", price: "Rs. 48,000", location: "Lahan, Siraha", time: "3 hours ago", photo: require("../../assets/listings/phone.jpg"), extra: ["8 GB RAM"], tags: ["Phones"] },
  { id: "e3", key: "electronics", title: "Wireless Earbuds", price: "Rs. 2,499", location: "Lahan Bazaar", time: "Yesterday", photo: require("../../assets/listings/phone.jpg"), extra: ["New"], tags: ["Gadgets"] },
  { id: "e4", key: "electronics", title: "Power Bank 20000mAh", price: "Rs. 1,899", location: "Siraha", time: "2 days ago", photo: require("../../assets/listings/phone.jpg"), extra: ["Fast charge"], tags: ["Gadgets"] },

  { id: "u1", key: "used", title: "Wooden Double Bed", price: "Rs. 12,000", location: "Lahan-3, Siraha", time: "1 hour ago", photo: require("../../assets/listings/modern.jpg"), extra: ["Used", "Good"], tags: ["Furniture", "For Sale"] },
  { id: "u2", key: "used", title: "Sofa Set 5 Seater", price: "Rs. 18,500", location: "Lahan-6, Siraha", time: "Yesterday", photo: require("../../assets/listings/modern.jpg"), badge: "FEATURED", extra: ["Fabric"], tags: ["Furniture", "For Sale"] },
  { id: "u3", key: "used", title: "Study Table", price: "Rs. 3,500", location: "Lahan, Siraha", time: "2 days ago", photo: require("../../assets/listings/office.jpg"), extra: ["With drawer"], tags: ["Furniture", "For Sale"] },
  { id: "u4", key: "used", title: "Kids Bicycle", price: "Rs. 4,200", location: "Golbazar", time: "3 days ago", photo: require("../../assets/listings/bike.jpg"), extra: ["16 inch"], tags: ["For Sale"] },

  { id: "o1", key: "others", title: "Event Tent Rental", price: "Rs. 3,000 /day", location: "Lahan, Siraha", time: "5 hours ago", photo: require("../../assets/listings/office.jpg"), extra: ["50 people"], tags: ["All"] },
  { id: "o2", key: "others", title: "Wedding Decorator", price: "Rs. 25,000", location: "Siraha", time: "Yesterday", photo: require("../../assets/listings/services.jpg"), extra: ["Full setup"], tags: ["All"] },
  { id: "o3", key: "others", title: "Tutor — Class 10", price: "Rs. 4,000 /mo", location: "Lahan-4", time: "2 days ago", photo: require("../../assets/listings/jobs.jpg"), extra: ["Math & Science"], tags: ["All"] },
];

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

export function adsCount(item: CatalogItem) {
  const n = item.id.charCodeAt(0) + item.id.charCodeAt(item.id.length - 1);
  return 12 + (n % 420);
}

export function sellerPhone() {
  return "981-2345678";
}

export const nearbyCatalogId: Record<string, string> = {
  b1: "p7",
  b2: "p3",
  b3: "p1",
  b4: "p2",
  b5: "p8",
  b6: "p5",
  b7: "v2",
  b8: "p9",
  b9: "e1",
  b10: "s2",
};

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
};

export function priceValue(price: string) {
  return Number(price.replace(/[^\d]/g, "")) || 0;
}
