import type { CatalogKey } from "../data/catalog";
import type { SellerPage } from "../data/sellerHub";

export function openCategory(
  navigation: { navigate: (...args: any[]) => void },
  key: CatalogKey,
  filter?: string,
) {
  navigation.navigate("CategoryBrowse", { key, filter: filter ?? "All" });
}

export function openMapSearch(
  navigation: { navigate: (...args: any[]) => void },
  params?: { q?: string; key?: CatalogKey | "all"; view?: "map" | "list" | "grid" },
) {
  navigation.navigate("MapSearch", params || {});
}

export function openListing(
  navigation: { navigate: (...args: any[]) => void },
  id: string,
  manage = false,
) {
  navigation.navigate("ListingDetail", { id, manage });
}

export function openSellerPage(navigation: { navigate: (...args: any[]) => void }, page: SellerPage) {
  navigation.navigate("SellerHub", { page });
}

export function openChatInbox(navigation: { navigate: (...args: any[]) => void }) {
  navigation.navigate("ChatInbox");
}

function navigateNamed(navigation: any, name: string, params?: object) {
  let current = navigation;
  for (let i = 0; i < 6 && current; i++) {
    const names: string[] | undefined = current.getState?.()?.routeNames;
    if (names?.includes(name)) {
      current.navigate(name, params);
      return;
    }
    current = current.getParent?.();
  }
  navigation.navigate(name, params);
}

export function openChatThread(navigation: { navigate: (...args: any[]) => void }, id: string) {
  navigateNamed(navigation, "ChatThread", { id });
}
