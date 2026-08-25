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

export type StaffAccess = {
  isSuperAdmin?: boolean;
  permissions?: string[];
};

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
  return allowed[0]?.href || "/admin";
}
