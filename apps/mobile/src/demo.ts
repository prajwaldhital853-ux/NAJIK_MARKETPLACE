import type { AppUser } from "./types";

export const DEMO_USER: AppUser = {
  full_name: "Sunil K. Sah",
  phone: "9800000000",
  email: "sunil@najik.local",
  account_type: "user",
  verification_status: "none",
  phone_verified: true,
  email_verified: true,
};

export function isProvider(user?: { account_type?: string } | null) {
  return user?.account_type === "provider";
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
