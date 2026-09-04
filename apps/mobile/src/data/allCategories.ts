import type { CatalogKey } from "./catalog";
import type { DrawerIconKey } from "./categoryIcons";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type Ion = ComponentProps<typeof Ionicons>["name"];

export type BrowseCategoryTile = {
  id: string;
  label: string;
  icon: Ion;
  iconKey?: DrawerIconKey;
  tint: string;
  key: CatalogKey;
  filter?: string;
};

export const VEHICLE_CATEGORY_TILES: BrowseCategoryTile[] = [
  { id: "vehicles", label: "Vehicles", icon: "bus-outline", iconKey: "vehicles", tint: "#DBEAFE", key: "vehicles" },
  { id: "cars", label: "Cars", icon: "car-outline", iconKey: "vehicles", tint: "#FEE2E2", key: "vehicles", filter: "Cars" },
  { id: "bikes", label: "Bikes", icon: "bicycle-outline", iconKey: "vehicles", tint: "#E0E7FF", key: "vehicles", filter: "Bikes" },
  { id: "property", label: "Properties", icon: "business-outline", iconKey: "property", tint: "#DCFCE7", key: "property" },
];

export const OTHER_CATEGORY_TILES: BrowseCategoryTile[] = [
  { id: "electronics", label: "Electronics", icon: "tv-outline", iconKey: "electronics", tint: "#E0F2FE", key: "electronics" },
  { id: "computers", label: "Computer & Laptops", icon: "laptop-outline", iconKey: "electronics", tint: "#EDE9FE", key: "electronics", filter: "Laptops" },
  { id: "phones", label: "Mobile", icon: "phone-portrait-outline", iconKey: "electronics", tint: "#DBEAFE", key: "electronics", filter: "Phones" },
  { id: "furniture", label: "Furniture", icon: "bed-outline", iconKey: "used", tint: "#FFEDD5", key: "used", filter: "Furniture" },
  { id: "home", label: "Home & Office", icon: "home-outline", iconKey: "used", tint: "#DCFCE7", key: "used", filter: "Home items" },
  { id: "fashion", label: "Fashion", icon: "shirt-outline", iconKey: "used", tint: "#FCE7F3", key: "used", filter: "Fashion" },
  { id: "beauty", label: "Beauty", icon: "sparkles-outline", iconKey: "used", tint: "#F3E8FF", key: "used", filter: "Other" },
  { id: "jobs", label: "Jobs", icon: "briefcase-outline", iconKey: "jobs", tint: "#FFEDD5", key: "jobs" },
  { id: "services", label: "Services", icon: "construct-outline", iconKey: "services", tint: "#EDE9FE", key: "services" },
  { id: "shops", label: "Shops", icon: "storefront-outline", iconKey: "shops", tint: "#FEE2E2", key: "shops" },
  { id: "used", label: "Used Items", icon: "pricetag-outline", iconKey: "used", tint: "#D1FAE5", key: "used" },
  { id: "others", label: "Others", icon: "grid-outline", iconKey: "others", tint: "#F3F4F6", key: "others" },
];
