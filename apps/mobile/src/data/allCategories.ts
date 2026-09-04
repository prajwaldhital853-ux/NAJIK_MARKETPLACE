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
  { id: "phones", label: "Mobile", image: require("../../assets/categories/cat-mobile.png"), key: "electronics", filter: "Phones" },
  { id: "bikes", label: "Bikes", image: require("../../assets/categories/cat-bikes.png"), key: "vehicles", filter: "Bikes" },
  { id: "cars", label: "Cars", image: require("../../assets/categories/cat-cars.png"), key: "vehicles", filter: "Cars" },
  { id: "vehicles", label: "Vehicles", image: require("../../assets/categories/cat-vehicles-mix.png"), key: "vehicles" },
  { id: "electronics", label: "Electronics", image: require("../../assets/categories/cat-electronics.png"), key: "electronics" },
  { id: "computers", label: "Computer & Laptops", image: require("../../assets/categories/cat-computers.png"), key: "electronics", filter: "Laptops" },
  { id: "property", label: "Properties", image: require("../../assets/categories/cat-properties.png"), key: "property" },
  { id: "furniture", label: "Furniture", image: require("../../assets/categories/cat-furniture.png"), key: "used", filter: "Furniture" },
  { id: "home", label: "Home & Office", image: require("../../assets/categories/cat-home-office.png"), key: "used", filter: "Home items" },
  { id: "fashion", label: "Fashion", image: require("../../assets/categories/cat-fashion.png"), key: "used", filter: "Fashion" },
  { id: "beauty", label: "Cosmetic", image: require("../../assets/categories/cat-beauty.png"), key: "used", filter: "Other" },
  { id: "shops", label: "Businesses & Industries", image: require("../../assets/categories/cat-business.png"), key: "shops" },
  { id: "jobs", label: "Jobs", image: require("../../assets/categories/cat-jobs.png"), key: "jobs" },
  { id: "services", label: "Services", image: require("../../assets/categories/cat-services.png"), key: "services" },
  { id: "used", label: "Used Items", image: require("../../assets/categories/cat-used.png"), key: "used" },
  { id: "others", label: "Others", image: require("../../assets/categories/cat-others.png"), key: "others" },
];

export const VEHICLE_CATEGORY_TILES = ALL_CATEGORY_TILES.filter((tile) =>
  ["vehicles", "cars", "bikes", "property"].includes(tile.id),
);
export const OTHER_CATEGORY_TILES = ALL_CATEGORY_TILES.filter((tile) => !VEHICLE_CATEGORY_TILES.some((row) => row.id === tile.id));
