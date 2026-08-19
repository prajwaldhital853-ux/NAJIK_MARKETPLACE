import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type Ion = ComponentProps<typeof Ionicons>["name"];

export type ListingCategory = {
  key: string;
  label: string;
  hint: string;
  icon: Ion;
  color: string;
  bg: string;
  subs: { key: string; icon: Ion }[];
};

export const LISTING_CATEGORIES: ListingCategory[] = [
  {
    key: "property",
    label: "Property",
    hint: "House, land, flat, room",
    icon: "home-outline",
    color: "#1B7D2C",
    bg: "#E4F6EA",
    subs: [
      { key: "House", icon: "home-outline" },
      { key: "Flat", icon: "business-outline" },
      { key: "Apartment", icon: "apps-outline" },
      { key: "Land", icon: "leaf-outline" },
      { key: "Room", icon: "bed-outline" },
      { key: "Shop space", icon: "storefront-outline" },
      { key: "Office", icon: "briefcase-outline" },
    ],
  },
  {
    key: "vehicles",
    label: "Vehicles",
    hint: "Cars, bikes, parts",
    icon: "car-outline",
    color: "#2563EB",
    bg: "#E8F1FE",
    subs: [
      { key: "Car", icon: "car-outline" },
      { key: "Bike", icon: "bicycle-outline" },
      { key: "Scooter", icon: "speedometer-outline" },
      { key: "Truck", icon: "bus-outline" },
      { key: "Parts", icon: "construct-outline" },
    ],
  },
  {
    key: "jobs",
    label: "Jobs",
    hint: "Hiring near you",
    icon: "briefcase-outline",
    color: "#EA580C",
    bg: "#FFF1E0",
    subs: [
      { key: "Full time", icon: "time-outline" },
      { key: "Part time", icon: "hourglass-outline" },
      { key: "Freelance", icon: "laptop-outline" },
      { key: "Internship", icon: "school-outline" },
    ],
  },
  {
    key: "services",
    label: "Services",
    hint: "Local help at the door",
    icon: "construct-outline",
    color: "#7C3AED",
    bg: "#F1E9FF",
    subs: [
      { key: "Plumbing", icon: "water-outline" },
      { key: "Electrical", icon: "flash-outline" },
      { key: "Cleaning", icon: "sparkles-outline" },
      { key: "Tutoring", icon: "book-outline" },
      { key: "Other service", icon: "apps-outline" },
    ],
  },
  {
    key: "marketplace",
    label: "Marketplace",
    hint: "Used items and gadgets",
    icon: "cart-outline",
    color: "#0F766E",
    bg: "#E7F6EC",
    subs: [
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
  },
  {
    key: "business",
    label: "Business",
    hint: "Shops and storefronts",
    icon: "storefront-outline",
    color: "#DC2626",
    bg: "#FDECEC",
    subs: [
      { key: "Retail shop", icon: "storefront-outline" },
      { key: "Restaurant", icon: "restaurant-outline" },
      { key: "Office space", icon: "business-outline" },
    ],
  },
  {
    key: "nearby",
    label: "Nearby",
    hint: "Anything else local",
    icon: "location-outline",
    color: "#1D4ED8",
    bg: "#EEF4FF",
    subs: [
      { key: "Other", icon: "apps-outline" },
      { key: "Event", icon: "calendar-outline" },
      { key: "Rental", icon: "key-outline" },
    ],
  },
];

export const CONTACT_OPTIONS = [
  { key: "phone", label: "Phone calls", icon: "call-outline" as Ion },
  { key: "chat", label: "In-app chat", icon: "chatbubble-outline" as Ion },
  { key: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" as Ion },
  { key: "both", label: "Phone + chat", icon: "apps-outline" as Ion },
];

export const NEPAL_CITIES = ["Lahan", "Siraha", "Golbazar", "Mirchaiya", "Rajbiraj", "Biratnagar", "Kathmandu", "Other"];

export const DEAL_TYPES = [
  { key: "For Sale", icon: "home-outline" as Ion, color: "#1B7D2C", bg: "#E4F6EA" },
  { key: "For Rent", icon: "key-outline" as Ion, color: "#2563EB", bg: "#E8F1FE" },
  { key: "Land", icon: "leaf-outline" as Ion, color: "#0F766E", bg: "#E7F6EC" },
  { key: "Commercial", icon: "business-outline" as Ion, color: "#7C3AED", bg: "#F1E9FF" },
];

export const PROPERTY_TYPES: Record<string, { key: string; icon: Ion }[]> = {
  "For Sale": [
    { key: "House", icon: "home-outline" },
    { key: "Flat", icon: "business-outline" },
    { key: "Apartment", icon: "apps-outline" },
    { key: "Room", icon: "bed-outline" },
  ],
  "For Rent": [
    { key: "House", icon: "home-outline" },
    { key: "Flat", icon: "business-outline" },
    { key: "Apartment", icon: "apps-outline" },
    { key: "Room", icon: "bed-outline" },
    { key: "Shop space", icon: "storefront-outline" },
  ],
  Land: [{ key: "Land", icon: "leaf-outline" }],
  Commercial: [
    { key: "Shop space", icon: "storefront-outline" },
    { key: "Office", icon: "briefcase-outline" },
    { key: "Commercial building", icon: "business-outline" },
  ],
};

export const FEATURE_PRESETS = [
  "3 Bedrooms",
  "2 Bathrooms",
  "1 Kitchen",
  "Car Parking",
  "Garden",
  "Water tank",
  "Solar",
  "Furnished",
  "Balcony",
  "CCTV",
];
