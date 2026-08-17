import type { CatalogKey } from "../data/catalog";
import type { SellerPage } from "../data/sellerHub";

export function openCategory(
  navigation: { navigate: (...args: any[]) => void },
  key: CatalogKey,
  filter?: string,
) {
  navigation.navigate("CategoryBrowse", { key, filter: filter ?? "All" });
}

export function openListing(navigation: { navigate: (...args: any[]) => void }, id: string) {
  navigation.navigate("ListingDetail", { id });
}

export function openSellerPage(navigation: { navigate: (...args: any[]) => void }, page: SellerPage) {
  navigation.navigate("SellerHub", { page });
}
