import type { CatalogKey } from "../data/catalog";
import type { SellerPage } from "../data/sellerHub";
import { dismissInboxTargetOnVisit, normTargetId, uuidFromNorm } from "../inboxBridge";
import { prefetchListing } from "../listingsApi";

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
  prefetchListing(id);
  dismissInboxTargetOnVisit({ target: "listing", target_id: normTargetId(id) });
  navigation.navigate("ListingDetail", { id, manage });
}

export function openUrgentSellList(navigation: { navigate: (...args: any[]) => void }) {
  navigation.navigate("UrgentSellList");
}

export function openSellerPage(navigation: { navigate: (...args: any[]) => void }, page: SellerPage, extra?: object) {
  navigation.navigate("SellerHub", { page, ...extra });
}

export function openBookings(navigation: { navigate: (...args: any[]) => void }, bookingId?: string) {
  if (bookingId) dismissInboxTargetOnVisit({ kind: "booking", target_id: normTargetId(bookingId) });
  else dismissInboxTargetOnVisit({ kind: "booking" });
  navigateNamed(navigation, "Bookings", bookingId ? { bookingId } : undefined);
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
  const threadId = uuidFromNorm(id);
  dismissInboxTargetOnVisit({ target: "chat", target_id: threadId, kind: "message" });
  navigateNamed(navigation, "ChatThread", { id: threadId });
}

export function openHomeSection(
  navigation: { navigate: (...args: any[]) => void },
  section: "recommended" | "trending" | "verified" | "latest",
  options?: { title?: string; catalog?: CatalogKey },
) {
  navigateNamed(navigation, "HomeSection", { section, title: options?.title, catalog: options?.catalog });
}

export function openSellerProfile(
  navigation: { navigate: (...args: any[]) => void },
  userId: string,
  preview?: { full_name?: string; account_type?: "user" | "provider" },
) {
  navigateNamed(navigation, "SellerProfile", { userId, ...preview });
}

export function openProviderIdCard(navigation: { navigate: (...args: any[]) => void }) {
  navigateNamed(navigation, "ProviderIdCard");
}

export function openBuyerReviewsGiven(navigation: { navigate: (...args: any[]) => void }) {
  navigateNamed(navigation, "BuyerReviewsGiven");
}

export function openBuyerRecentViews(navigation: { navigate: (...args: any[]) => void }) {
  navigateNamed(navigation, "BuyerRecentViews");
}
