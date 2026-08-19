import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type Ion = ComponentProps<typeof Ionicons>["name"];

export type ListingVertical = "property" | "jobs" | "vehicles" | "services" | "nearby" | "marketplace";

export function verticalForService(serviceType?: string | null): ListingVertical {
  const value = (serviceType || "").toLowerCase();
  if (value.includes("used") || value.includes("market")) return "marketplace";
  if (value.includes("job")) return "jobs";
  if (value.includes("vehicle") || value.includes("car")) return "vehicles";
  if (value.includes("other")) return "nearby";
  if (value.includes("service")) return "services";
  return "property";
}

export function verticalFromCategory(category?: string | null): ListingVertical {
  if (category === "jobs" || category === "vehicles" || category === "services" || category === "nearby" || category === "marketplace") {
    return category;
  }
  return "property";
}

type KindCard = { key: string; icon: Ion; color: string; bg: string };

export const VERTICAL_COPY: Record<
  ListingVertical,
  {
    banner: string;
    kindLabel: string;
    typeLabel: string;
    titleLabel: string;
    titleHint: string;
    titlePlaceholder: string;
    descLabel: string;
    descPlaceholder: string;
    priceLabel: string;
    pricePlaceholder: string;
    featureLabel: string;
    photoHint: string;
    photosRequired: boolean;
  }
> = {
  property: {
    banner: "Let's create a listing that gets you more leads!",
    kindLabel: "What do you want to list?",
    typeLabel: "Property Type",
    titleLabel: "Property Title",
    titleHint: "Keep it short and specific so buyers can find it.",
    titlePlaceholder: "Modern 3 BHK House for Sale in Lazimpat, Kathmandu.",
    descLabel: "Short Description",
    descPlaceholder: "Tell buyers what makes this property stand out.",
    priceLabel: "Price (NPR)",
    pricePlaceholder: "2500000",
    featureLabel: "Add Feature",
    photoHint: "Photos are optional — up to 8 images, compressed before upload.",
    photosRequired: false,
  },
  jobs: {
    banner: "Post a job vacancy like you would on LinkedIn — title, role type, pay and how to apply.",
    kindLabel: "Job type",
    typeLabel: "Workplace",
    titleLabel: "Job title",
    titleHint: "Use a clear role name, e.g. Sales Executive — Lahan.",
    titlePlaceholder: "Sales Executive — Lahan branch",
    descLabel: "Job description",
    descPlaceholder: "Responsibilities, requirements, working hours and benefits.",
    priceLabel: "Monthly salary (NPR)",
    pricePlaceholder: "35000",
    featureLabel: "Add skill",
    photoHint: "Optional: company logo or workplace photos.",
    photosRequired: false,
  },
  vehicles: {
    banner: "List a car, bike or spare so nearby buyers can inspect it.",
    kindLabel: "How do you want to list it?",
    typeLabel: "Vehicle type",
    titleLabel: "Vehicle title",
    titleHint: "Include make, model and year.",
    titlePlaceholder: "Hyundai Creta 2022 — single owner",
    descLabel: "Vehicle description",
    descPlaceholder: "Condition, service history, papers and what is included.",
    priceLabel: "Price (NPR)",
    pricePlaceholder: "1850000",
    featureLabel: "Add spec",
    photoHint: "Photos are optional. Add exterior, interior or paper photos if you have them.",
    photosRequired: false,
  },
  services: {
    banner: "Offer a local service buyers can book near them.",
    kindLabel: "What service do you offer?",
    typeLabel: "Service type",
    titleLabel: "Service title",
    titleHint: "Say what you do and where you work.",
    titlePlaceholder: "Same-day plumbing in Lahan",
    descLabel: "Service description",
    descPlaceholder: "What is included, tools, timing and areas you cover.",
    priceLabel: "Starting rate (NPR)",
    pricePlaceholder: "1500",
    featureLabel: "Add skill",
    photoHint: "Photos are optional. Add work photos if you have them.",
    photosRequired: false,
  },
  nearby: {
    banner: "Post anything local — a shop, event, rental or other nearby offer.",
    kindLabel: "What are you posting?",
    typeLabel: "Listing type",
    titleLabel: "Listing title",
    titleHint: "Keep it specific so people nearby can find it.",
    titlePlaceholder: "Kirana shop space near Lahan bazaar",
    descLabel: "Description",
    descPlaceholder: "What you are offering and who it is for.",
    priceLabel: "Price / rate (NPR)",
    pricePlaceholder: "5000",
    featureLabel: "Add tag",
    photoHint: "Photos are optional. Add pictures of the place or item if you have them.",
    photosRequired: false,
  },
  marketplace: {
    banner: "Sell electronics, furniture, phones, fashion and other products nearby.",
    kindLabel: "Condition",
    typeLabel: "Item type",
    titleLabel: "Item title",
    titleHint: "Name the product, brand and what buyers get.",
    titlePlaceholder: "iPhone 13 — 128GB, battery 88%",
    descLabel: "Item description",
    descPlaceholder: "Condition, age, what’s included, and why you are selling.",
    priceLabel: "Price (NPR)",
    pricePlaceholder: "45000",
    featureLabel: "Add tag",
    photoHint: "Photos are optional. Add clear pictures of the item if you have them.",
    photosRequired: false,
  },
};

export const KIND_CARDS: Record<ListingVertical, KindCard[]> = {
  property: [
    { key: "For Sale", icon: "home-outline", color: "#1B7D2C", bg: "#E4F6EA" },
    { key: "For Rent", icon: "key-outline", color: "#2563EB", bg: "#E8F1FE" },
    { key: "Land", icon: "leaf-outline", color: "#0F766E", bg: "#E7F6EC" },
    { key: "Commercial", icon: "business-outline", color: "#7C3AED", bg: "#F1E9FF" },
  ],
  jobs: [
    { key: "Full time", icon: "briefcase-outline", color: "#EA580C", bg: "#FFF1E0" },
    { key: "Part time", icon: "time-outline", color: "#2563EB", bg: "#E8F1FE" },
    { key: "Contract", icon: "document-text-outline", color: "#7C3AED", bg: "#F1E9FF" },
    { key: "Internship", icon: "school-outline", color: "#0F766E", bg: "#E7F6EC" },
  ],
  vehicles: [
    { key: "For Sale", icon: "car-outline", color: "#1B7D2C", bg: "#E4F6EA" },
    { key: "For Rent", icon: "key-outline", color: "#2563EB", bg: "#E8F1FE" },
  ],
  services: [
    { key: "Plumbing", icon: "water-outline", color: "#2563EB", bg: "#E8F1FE" },
    { key: "Electrical", icon: "flash-outline", color: "#EA580C", bg: "#FFF1E0" },
    { key: "Cleaning", icon: "sparkles-outline", color: "#0F766E", bg: "#E7F6EC" },
    { key: "Tutoring", icon: "book-outline", color: "#7C3AED", bg: "#F1E9FF" },
  ],
  nearby: [
    { key: "Shop", icon: "storefront-outline", color: "#1B7D2C", bg: "#E4F6EA" },
    { key: "Event", icon: "calendar-outline", color: "#EA580C", bg: "#FFF1E0" },
    { key: "Rental", icon: "key-outline", color: "#2563EB", bg: "#E8F1FE" },
    { key: "Other", icon: "apps-outline", color: "#7C3AED", bg: "#F1E9FF" },
  ],
  marketplace: [
    { key: "New", icon: "sparkles-outline", color: "#1B7D2C", bg: "#E4F6EA" },
    { key: "Used", icon: "pricetag-outline", color: "#0F766E", bg: "#E7F6EC" },
  ],
};

export const TYPE_OPTIONS: Record<ListingVertical, { key: string; icon: Ion }[]> = {
  property: [
    { key: "House", icon: "home-outline" },
    { key: "Flat", icon: "business-outline" },
    { key: "Apartment", icon: "apps-outline" },
    { key: "Land", icon: "leaf-outline" },
    { key: "Room", icon: "bed-outline" },
    { key: "Shop space", icon: "storefront-outline" },
    { key: "Office", icon: "briefcase-outline" },
  ],
  jobs: [
    { key: "On-site", icon: "business-outline" },
    { key: "Hybrid", icon: "people-outline" },
    { key: "Remote", icon: "laptop-outline" },
  ],
  vehicles: [
    { key: "Car", icon: "car-outline" },
    { key: "Bike", icon: "bicycle-outline" },
    { key: "Scooter", icon: "speedometer-outline" },
    { key: "Van", icon: "bus-outline" },
    { key: "Truck", icon: "bus-outline" },
    { key: "Parts", icon: "construct-outline" },
  ],
  services: [
    { key: "Plumbing", icon: "water-outline" },
    { key: "Electrical", icon: "flash-outline" },
    { key: "Cleaning", icon: "sparkles-outline" },
    { key: "Tutoring", icon: "book-outline" },
    { key: "Other service", icon: "apps-outline" },
  ],
  nearby: [
    { key: "Shop", icon: "storefront-outline" },
    { key: "Event", icon: "calendar-outline" },
    { key: "Rental", icon: "key-outline" },
    { key: "Other", icon: "apps-outline" },
  ],
  marketplace: [
    { key: "Electronics", icon: "phone-portrait-outline" },
    { key: "Furniture", icon: "bed-outline" },
    { key: "Phones", icon: "call-outline" },
    { key: "Laptops", icon: "laptop-outline" },
    { key: "Appliances", icon: "tv-outline" },
    { key: "Fashion", icon: "shirt-outline" },
    { key: "Bikes", icon: "bicycle-outline" },
    { key: "Books", icon: "book-outline" },
    { key: "Home items", icon: "home-outline" },
    { key: "Other", icon: "apps-outline" },
  ],
};

export const VERTICAL_DEFAULTS: Record<ListingVertical, { deal: string; type: string }> = {
  property: { deal: "For Sale", type: "House" },
  jobs: { deal: "Full time", type: "On-site" },
  vehicles: { deal: "For Sale", type: "Car" },
  services: { deal: "Plumbing", type: "Plumbing" },
  nearby: { deal: "Shop", type: "Shop" },
  marketplace: { deal: "Used", type: "Electronics" },
};

export const VERTICAL_FEATURES: Record<ListingVertical, string[]> = {
  property: ["3 Bedrooms", "2 Bathrooms", "1 Kitchen", "Car Parking", "Garden", "Water tank", "Solar", "Furnished"],
  jobs: ["Sales", "Customer service", "Excel", "Nepali + English", "Driving license", "Immediate joining"],
  vehicles: ["Single owner", "Service history", "Insurance valid", "Loan available", "Accident-free"],
  services: ["Same day", "Tools included", "Verified work", "Warranty", "Emergency call"],
  nearby: ["Open daily", "Parking", "Main road", "Newly listed"],
  marketplace: ["Bill available", "Box included", "Warranty left", "Negotiable", "Pickup only", "Home delivery"],
};

export const MARKETPLACE_ELECTRONICS = ["Electronics", "Phones", "Laptops", "Appliances"];

export const JOB_EXPERIENCE = ["Internship", "Entry level", "1–3 years", "3–5 years", "5+ years"];
export const VEHICLE_FUEL = ["Petrol", "Diesel", "Electric", "Hybrid"];
export const SERVICE_RATE = ["Per visit", "Per hour", "Per day", "Fixed job"];
