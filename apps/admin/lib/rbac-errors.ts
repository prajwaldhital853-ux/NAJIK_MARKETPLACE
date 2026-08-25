import { ApiError } from "./api";
import type { RbacAction } from "./rbac";

export const RBAC_PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  user_management: "User Management",
  property_management: "Property Management",
  job_management: "Job Management",
  service_management: "Service Management",
  electronics_management: "Electronics Management",
  other_listings: "Other Listings",
  orders_bookings: "Orders & Bookings",
  seller_payments: "Seller Payments",
  kyc_verification: "KYC / Verification",
  reports_complaints: "Reports & Complaints",
  reviews_ratings: "Reviews & Ratings",
  notifications: "Notifications",
  ads_promotions: "Ads & Promotions",
  analytics: "Analytics",
  app_control: "General App Control",
  staff_management: "Admin & Staff Management",
  settings: "Settings",
};

const ACTION_VERB: Record<RbacAction, string> = {
  view: "view",
  create: "create",
  update: "edit or change",
  delete: "delete",
};

const ACTION_PERMISSION_LABEL: Record<RbacAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

function pageLabel(page: string) {
  return RBAC_PAGE_LABELS[page] || page.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRbacDeniedMessage(action: RbacAction, page: string): string {
  const label = pageLabel(page);
  const verb = ACTION_VERB[action];
  const perm = ACTION_PERMISSION_LABEL[action];

  if (action === "view") {
    return `You don't have access to ${label}. Ask your Super Admin to add ${perm} permission for this page on your role.`;
  }

  return `Read-only access: you cannot ${verb} ${label} data. Your role only has View permission here. Ask your Super Admin to add ${perm} permission for ${label} on your role.`;
}

export class RbacAccessError extends Error {
  action: RbacAction;
  page: string;

  constructor(action: RbacAction, page: string) {
    super(formatRbacDeniedMessage(action, page));
    this.name = "RbacAccessError";
    this.action = action;
    this.page = page;
  }
}

function parseBackendPermissionDetail(detail: string): string | null {
  const trimmed = detail.trim();
  if (!trimmed) return null;

  if (/^read-only access:/i.test(trimmed)) return trimmed;

  const codeMatch =
    trimmed.match(/Required:\s*([\w.]+)/i) ||
    trimmed.match(/\b([\w_]+)\.(view|create|update|delete)\b/i);
  if (codeMatch) {
    const code = codeMatch[1].includes(".") ? codeMatch[1] : `${codeMatch[1]}.${codeMatch[2]}`;
    const [page, action] = code.split(".") as [string, RbacAction];
    if (page && action) return formatRbacDeniedMessage(action, page);
  }

  if (/don't have permission/i.test(trimmed) || /permission denied/i.test(trimmed)) {
    return "Read-only access: you don't have permission for this action. Ask your Super Admin to update your role permissions.";
  }

  return null;
}

export function formatAdminError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof RbacAccessError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return parseBackendPermissionDetail(err.message) || err.message || fallback;
    }
    if (err.status === 401) return "Your session expired. Sign in again.";
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) {
    const parsed = parseBackendPermissionDetail(err.message);
    return parsed || err.message;
  }
  return fallback;
}

export function toastAdminError(toast: (text: string) => void, err: unknown, fallback?: string) {
  toast(formatAdminError(err, fallback));
}
