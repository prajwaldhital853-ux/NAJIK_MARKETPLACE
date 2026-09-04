import type { CatalogKey } from "./catalog";
import type { ImageSourcePropType } from "react-native";

export type BrowseCategoryTile = {
  id: string;
  label: string;
  image: ImageSourcePropType;
  key: CatalogKey;
  filter?: string;
};

export const ALL_CATEGORY_TILES: BrowseCategoryTile[] = [
  { id: "phones", label: "Mobile", image: require("../../assets/categories/cat-mobile.jpg"), key: "electronics", filter: "Phones" },
  { id: "bikes", label: "Bikes", image: require("../../assets/categories/cat-bikes.jpg"), key: "vehicles", filter: "Bikes" },
  { id: "cars", label: "Cars", image: require("../../assets/categories/cat-cars.jpg"), key: "vehicles", filter: "Cars" },
  { id: "vehicles", label: "Vehicles", image: require("../../assets/categories/cat-vehicles-mix.jpg"), key: "vehicles" },
  { id: "electronics", label: "Electronics", image: require("../../assets/categories/cat-electronics.jpg"), key: "electronics" },
  { id: "computers", label: "Computer & Laptops", image: require("../../assets/categories/cat-computers.jpg"), key: "electronics", filter: "Laptops" },
  { id: "property", label: "Properties", image: require("../../assets/categories/cat-properties.jpg"), key: "property" },
  { id: "furniture", label: "Furniture", image: require("../../assets/categories/cat-furniture.jpg"), key: "used", filter: "Furniture" },
  { id: "home", label: "Home & Office", image: require("../../assets/categories/cat-home-office.jpg"), key: "used", filter: "Home items" },
  { id: "fashion", label: "Fashion", image: require("../../assets/categories/cat-fashion.jpg"), key: "used", filter: "Fashion" },
  { id: "beauty", label: "Cosmetic", image: require("../../assets/categories/cat-beauty.jpg"), key: "used", filter: "Other" },
  { id: "shops", label: "Businesses & Industries", image: require("../../assets/categories/cat-business.jpg"), key: "shops" },
  { id: "jobs", label: "Jobs", image: require("../../assets/categories/cat-jobs.jpg"), key: "jobs" },
  { id: "services", label: "Services", image: require("../../assets/categories/cat-services.jpg"), key: "services" },
  { id: "used", label: "Used Items", image: require("../../assets/categories/cat-used.jpg"), key: "used" },
  { id: "others", label: "Others", image: require("../../assets/categories/cat-others.jpg"), key: "others" },
];

export const VEHICLE_CATEGORY_TILES = ALL_CATEGORY_TILES.filter((tile) =>
  ["vehicles", "cars", "bikes", "property"].includes(tile.id),
);
export const OTHER_CATEGORY_TILES = ALL_CATEGORY_TILES.filter((tile) => !VEHICLE_CATEGORY_TILES.some((row) => row.id === tile.id));
