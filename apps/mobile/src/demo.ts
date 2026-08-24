import type { AppUser } from "./types";

export function isProvider(user?: { account_type?: string } | null) {
  return user?.account_type === "provider";
}

export function contactVerified(user?: AppUser | null) {
  return Boolean(user?.phone_verified || user?.email_verified);
}

export function needsBuyerProfile(user?: AppUser | null) {
  return Boolean(user && user.account_type === "user" && user.needs_profile);
}

export function needsBuyerPhoneVerify(user?: AppUser | null) {
  return Boolean(user && user.account_type === "user" && user.phone && !user.phone_verified);
}

export function needsContactVerify(user?: AppUser | null) {
  return isProvider(user) && !contactVerified(user);
}

export function needsSellerApplication(user?: AppUser | null) {
  return isProvider(user) && contactVerified(user) && !user?.application_id;
}

export function isPendingProvider(user?: AppUser | null) {
  return isProvider(user) && user?.verification_status === "pending";
}

export function isVerifiedProvider(user?: AppUser | null) {
  return isProvider(user) && user?.verification_status === "verified";
}

export function isRejectedProvider(user?: AppUser | null) {
  return isProvider(user) && user?.verification_status === "rejected";
}

export function canPostServices(user?: AppUser | null) {
  if (!user || user.is_active === false) return false;
  if (user.account_status === "blocked" || user.account_status === "deactivated") return false;
  if (isProvider(user)) return isVerifiedProvider(user);
  return false;
}

export function isAccountRestricted(user?: AppUser | null) {
  if (!user) return false;
  if (user.is_active === false) return true;
  const status = (user.account_status || "").toLowerCase();
  return status === "blocked" || status === "deactivated";
}
