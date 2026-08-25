import { NAV, type NavItem } from "./nav";

/** Maps admin routes to RBAC view permission codes. */
export const NAV_PERMISSION: Record<string, string> = {
  "/admin": "dashboard.view",
  "/admin/users": "user_management.view",
  "/admin/properties": "property_management.view",
  "/admin/jobs": "job_management.view",
  "/admin/services": "service_management.view",
  "/admin/electronics": "electronics_management.view",
  "/admin/listings": "other_listings.view",
  "/admin/listing-queue": "other_listings.view",
  "/admin/orders": "orders_bookings.view",
  "/admin/payments": "seller_payments.view",
  "/admin/providers": "kyc_verification.view",
  "/admin/id-cards": "kyc_verification.view",
  "/admin/reports": "reports_complaints.view",
  "/admin/reviews": "reviews_ratings.view",
  "/admin/notifications": "notifications.view",
  "/admin/ads": "ads_promotions.view",
  "/admin/analytics": "analytics.view",
  "/admin/general-app-control": "app_control.view",
  "/admin/staff": "staff_management.view",
  "/admin/settings": "settings.view",
};

export type RbacAction = "view" | "create" | "update" | "delete";

export const LISTING_CATEGORY_PAGE: Record<string, string> = {
  property: "property_management",
  jobs: "job_management",
  services: "service_management",
  nearby: "electronics_management",
  vehicles: "other_listings",
  marketplace: "other_listings",
  business: "other_listings",
};

export const STORE_KEY_PAGE: Record<string, string> = {
  users: "user_management",
  properties: "property_management",
  jobs: "job_management",
  services: "service_management",
  gadgets: "electronics_management",
  others: "other_listings",
  kyc: "kyc_verification",
  reports: "reports_complaints",
  reviews: "reviews_ratings",
  notices: "notifications",
  ads: "ads_promotions",
  payments: "seller_payments",
  staff: "staff_management",
};

export function pageFromPath(pathname: string): string | null {
  const perm = permissionForPath(pathname);
  if (!perm) return null;
  return perm.replace(/\.view$/, "");
}

export function can(staff: StaffAccess | null | undefined, page: string, action: RbacAction): boolean {
  if (!page) return false;
  return hasPermission(staff, `${page}.${action}`);
}

export function canForPath(staff: StaffAccess | null | undefined, pathname: string, action: RbacAction): boolean {
  const page = pageFromPath(pathname);
  if (!page) return Boolean(staff?.isSuperAdmin);
  return can(staff, page, action);
}

export function canListing(
  staff: StaffAccess | null | undefined,
  category: string | undefined,
  action: RbacAction,
): boolean {
  const page = LISTING_CATEGORY_PAGE[category || ""] || "other_listings";
  return can(staff, page, action);
}

export function assertCan(staff: StaffAccess | null | undefined, page: string, action: RbacAction): void {
  if (!can(staff, page, action)) {
    throw new Error(`You don't have permission to ${action} this section.`);
  }
}

export function hasPermission(staff: StaffAccess | null | undefined, code: string): boolean {
  if (!staff) return false;
  if (staff.isSuperAdmin) return true;
  return (staff.permissions || []).includes(code);
}

export function permissionForPath(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return NAV_PERMISSION["/admin"];
  const entries = Object.entries(NAV_PERMISSION).filter(([href]) => href !== "/admin");
  entries.sort((a, b) => b[0].length - a[0].length);
  for (const [href, perm] of entries) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return perm;
  }
  return null;
}

export function canAccessPath(staff: StaffAccess | null | undefined, pathname: string): boolean {
  const perm = permissionForPath(pathname);
  if (!perm) return true;
  return hasPermission(staff, perm);
}

export function filterNavForStaff(nav: NavItem[], staff: StaffAccess | null | undefined): NavItem[] {
  if (!staff) return [];
  if (staff.isSuperAdmin) return nav;
  return nav.filter((item) => {
    const perm = NAV_PERMISSION[item.href];
    return !perm || hasPermission(staff, perm);
  });
}

export function firstAllowedPath(staff: StaffAccess | null | undefined): string {
  if (!staff) return "/admin/login";
  const allowed = filterNavForStaff(NAV, staff);
  // Never send staff to dashboard unless they have dashboard.view (it's in NAV order).
  return allowed[0]?.href || "/admin/login";
}

export function badgePermission(href: string): string | null {
  if (NAV_PERMISSION[href]) return NAV_PERMISSION[href];
  const base = href.split("?")[0];
  return NAV_PERMISSION[base] || null;
}

export function filterBadgesForStaff(
  badges: Record<string, number>,
  staff: StaffAccess | null | undefined,
): Record<string, number> {
  if (!staff) return {};
  if (staff.isSuperAdmin) return badges;
  const out: Record<string, number> = {};
  for (const [href, count] of Object.entries(badges)) {
    const perm = badgePermission(href);
    if (!perm || hasPermission(staff, perm)) out[href] = count;
  }
  return out;
}

export function filterInboxForStaff<T extends { permission: string }>(
  items: T[],
  staff: StaffAccess | null | undefined,
): T[] {
  if (!staff) return [];
  if (staff.isSuperAdmin) return items;
  return items.filter((item) => hasPermission(staff, item.permission));
}

export type StaffAccess = {
  isSuperAdmin?: boolean;
  permissions?: string[];
};
