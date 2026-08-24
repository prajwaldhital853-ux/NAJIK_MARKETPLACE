import type { ImageSourcePropType } from "react-native";
import type { CatalogKey } from "./catalog";

export type DrawerIconKey = CatalogKey | "home" | "bookings" | "map";

export const categoryIconSources: Record<DrawerIconKey, ImageSourcePropType> = {
  home: require("../../assets/categories/home.png"),
  bookings: require("../../assets/categories/bookings.png"),
  map: require("../../assets/categories/map.png"),
  property: require("../../assets/categories/property.png"),
  vehicles: require("../../assets/categories/vehicles.png"),
  jobs: require("../../assets/categories/jobs.png"),
  services: require("../../assets/categories/services.png"),
  shops: require("../../assets/categories/shops.png"),
  electronics: require("../../assets/categories/electronics.png"),
  used: require("../../assets/categories/used.png"),
  others: require("../../assets/categories/others.png"),
};

export function drawerIconKey(item: { title: string; catalog?: CatalogKey; tab: string }): DrawerIconKey {
  if (item.title === "Home") return "home";
  if (item.title === "Bookings") return "bookings";
  if (item.title === "Map Search") return "map";
  if (item.catalog) return item.catalog;
  return "others";
}
