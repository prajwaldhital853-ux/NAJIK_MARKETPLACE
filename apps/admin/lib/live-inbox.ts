import { relativeTime } from "./format";
import type { User } from "./demo-data";
import type { ProviderApplication, StaffListing, ChatReportTicket } from "./staff-api";

export const ADMIN_POLL_MS = 5000;
export const OPEN_INBOX_KEY = "najik_admin_open_inbox";
export const SEEN_INBOX_KEY = "najik_admin_seen_inbox_v1";

export type InboxKind = "buyer" | "seller" | "listing" | "report";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  detail: string;
  href: string;
  time: string;
  at: number;
};

export function listingQueueHref(category: string) {
  if (category === "property") return "/admin/properties?status=pending";
  if (category === "jobs") return "/admin/jobs?status=pending";
  if (category === "services") return "/admin/services?status=pending";
  if (category === "vehicles") return "/admin/listings?kind=vehicle";
  if (category === "marketplace") return "/admin/listings?kind=used";
  if (category === "business") return "/admin/listings?kind=shop";
  if (category === "nearby") return "/admin/electronics";
  return "/admin/listing-queue";
}

export function isPendingListing(row: StaffListing) {
  return row.status === "pending" || Boolean(row.has_pending_edit);
}

export function isPendingUser(user: User) {
  return user.status === "pending" || user.kyc === "pending";
}

export function isNewBuyer(user: User) {
  if (user.role === "provider") return false;
  if (isPendingUser(user) || user.status === "blocked") return false;
  if (!user.joinedAt) return false;
  const age = Date.now() - Date.parse(user.joinedAt);
  return Number.isFinite(age) && age >= 0 && age < 24 * 60 * 60 * 1000;
}

export function readSeenInbox(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_INBOX_KEY) || "[]") as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeSeenInbox(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_INBOX_KEY, JSON.stringify([...new Set(ids)]));
}

export function isSeenInbox(id: string, seen: Iterable<string>) {
  const set = seen instanceof Set ? seen : new Set(seen);
  return set.has(id);
}

export function isPendingApplication(row: ProviderApplication) {
  return row.status === "pending" || Boolean(row.has_pending_edit);
}

export function listingLabel(category: string) {
  const labels: Record<string, string> = {
    property: "Property",
    jobs: "Job",
    services: "Service",
    vehicles: "Vehicle",
    marketplace: "Used item",
    business: "Shop",
    nearby: "Nearby listing",
  };
  return labels[category] || "Listing";
}

export function isOpenChatReport(row: ChatReportTicket) {
  return row.status === "open" || row.status === "under_review";
}

export function buildInbox(
  users: User[],
  listings: StaffListing[],
  applications: ProviderApplication[],
  seen: Iterable<string> = [],
  reports: ChatReportTicket[] = [],
): InboxItem[] {
  const seenSet = seen instanceof Set ? seen : new Set(seen);
  const appOwnerIds = new Set(applications.filter(isPendingApplication).map((row) => row.owner_id).filter(Boolean));
  const items: InboxItem[] = [];

  applications.filter(isPendingApplication).forEach((row) => {
    const edit = Boolean(row.has_pending_edit && row.status !== "pending");
    items.push({
      id: `seller-${row.id}`,
      kind: "seller",
      title: edit ? `${row.full_name} updated seller profile` : `${row.full_name} applied as a seller`,
      detail: edit ? "Profile edit waiting" : `${row.service_type || "Service provider"} · KYC waiting`,
      href: "/admin/providers",
      time: relativeTime(row.created_at),
      at: Date.parse(row.created_at) || 0,
    });
  });

  users.filter((user) => isPendingUser(user) || isNewBuyer(user)).forEach((user) => {
    if (appOwnerIds.has(user.id)) return;
    const seller = user.role === "provider";
    items.push({
      id: `user-${user.id}`,
      kind: seller ? "seller" : "buyer",
      title: seller ? `${user.name} seller account pending` : `${user.name} signed up as a buyer`,
      detail: seller ? `${user.category} · KYC ${user.kyc}` : user.email || user.phone || "New user",
      href: seller ? `/admin/users?role=provider&id=${user.id}` : `/admin/users?role=buyer&id=${user.id}`,
      time: user.lastActive,
      at: Date.parse(user.joinedAt || "") || 0,
    });
  });

  listings.filter(isPendingListing).forEach((row) => {
    items.push({
      id: `listing-${row.id}`,
      kind: "listing",
      title: row.has_pending_edit ? `${row.title} has an edit request` : `New ${listingLabel(row.category).toLowerCase()}: ${row.title}`,
      detail: `${row.owner_name || "Seller"} · ${row.location || "Nepal"}`,
      href: listingQueueHref(row.category),
      time: relativeTime(row.created_at),
      at: Date.parse(row.created_at) || 0,
    });
  });

  reports.filter(isOpenChatReport).forEach((row) => {
    const reporter = row.reporter?.full_name || "A user";
    const accused = row.accused?.full_name || "another user";
    items.push({
      id: `report-${row.id}`,
      kind: "report",
      title: `${reporter} reported ${accused}`,
      detail: (row.reason || row.listing?.title || "Chat complaint").slice(0, 120),
      href: `/admin/reports?id=${row.id}`,
      time: relativeTime(row.created_at),
      at: Date.parse(row.created_at) || 0,
    });
  });

  return items
    .filter((item) => !seenSet.has(item.id))
    .sort((a, b) => b.at - a.at);
}

export function navBadges(
  users: User[],
  listings: StaffListing[],
  applications: ProviderApplication[],
  seen: Iterable<string> = [],
  reports: ChatReportTicket[] = [],
) {
  const seenSet = seen instanceof Set ? seen : new Set(seen);
  const pendingListings = listings.filter(isPendingListing);
  const byCat = (category: string) => pendingListings.filter((row) => row.category === category).length;
  const pendingApps = applications.filter(isPendingApplication).length;
  const pendingKyc = users.filter(isPendingUser);
  const unseenNewBuyers = users.filter((user) => isNewBuyer(user) && !seenSet.has(`user-${user.id}`));
  const pendingUsers = [...pendingKyc, ...unseenNewBuyers.filter((user) => !pendingKyc.some((row) => row.id === user.id))];
  const pendingBuyers = pendingUsers.filter((user) => user.role === "buyer").length;
  const pendingProviders = pendingUsers.filter((user) => user.role === "provider").length;
  const other = byCat("vehicles") + byCat("business") + byCat("nearby");
  const openReports = reports.filter(isOpenChatReport).filter((row) => !seenSet.has(`report-${row.id}`)).length;
  const inboxCount = buildInbox(users, listings, applications, seenSet, reports).length;

  return {
    "/admin/users": pendingUsers.length + pendingApps,
    "/admin/users?role=buyer": pendingBuyers,
    "/admin/users?role=provider": pendingProviders + pendingApps,
    "/admin/users?status=pending": pendingUsers.length,
    "/admin/properties": byCat("property"),
    "/admin/properties?status=pending": byCat("property"),
    "/admin/jobs": byCat("jobs"),
    "/admin/jobs?status=pending": byCat("jobs"),
    "/admin/services": byCat("services"),
    "/admin/services?status=pending": byCat("services"),
    "/admin/electronics": byCat("marketplace"),
    "/admin/electronics?status=pending": byCat("marketplace"),
    "/admin/listings": other,
    "/admin/listing-queue": pendingListings.length,
    "/admin/listings?kind=vehicle": byCat("vehicles"),
    "/admin/listings?kind=used": byCat("marketplace"),
    "/admin/listings?kind=shop": byCat("business"),
    "/admin/providers": pendingApps,
    "/admin/providers?status=pending": pendingApps,
    "/admin/notifications": inboxCount,
    "/admin/reports": openReports,
    "/admin/reports?status=open": openReports,
  } as Record<string, number>;
}
