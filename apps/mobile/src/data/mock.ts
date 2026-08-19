import type { Inquiry, Listing } from "../types";

export const nearbyListings: Listing[] = [];
export const myListings: Listing[] = [];
export const inquiries: Inquiry[] = [];
export const savedListings: Listing[] = [];
export const buyerNearbyListings: Listing[] = [];

export const browseCategories = [
  { id: "houses", title: "Houses", count: "0 Listings", image: "", icon: "home" as const, tint: "#3B82F6" },
  { id: "apartments", title: "Apartments", count: "0 Listings", image: "", icon: "business" as const, tint: "#22C55E" },
  { id: "land", title: "Land", count: "0 Listings", image: "", icon: "map" as const, tint: "#16A34A" },
  { id: "office", title: "Office Space", count: "0 Listings", image: "", icon: "briefcase" as const, tint: "#6366F1" },
];
