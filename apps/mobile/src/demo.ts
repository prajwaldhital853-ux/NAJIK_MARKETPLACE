import type { AppUser } from "./types";

export function isProvider(user?: { account_type?: string } | null) {
  return user?.account_type === "provider";
}

export function contactVerified(user?: AppUser | null) {
  return Boolean(user?.phone_verified || user?.email_verified);
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
  if (isProvider(user)) return isVerifiedProvider(user);
  return true;
}
