import { ADMIN_URL, AUTO_VERIFY_PROVIDERS } from "./config";
import type { AppUser, ProviderServiceType, VerificationStatus } from "./types";

export type ProviderApplication = {
  id: string;
  full_name: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  service_type: ProviderServiceType | string;
  nagrita_uri?: string;
  photo_uri?: string;
  status: VerificationStatus;
  created_at: string;
};

export async function submitProviderApplication(
  payload: Omit<ProviderApplication, "id" | "status" | "created_at">,
): Promise<ProviderApplication> {
  const local: ProviderApplication = {
    ...payload,
    id: `app_${Date.now()}`,
    status: AUTO_VERIFY_PROVIDERS ? "verified" : "pending",
    created_at: new Date().toISOString(),
  };
  try {
    const response = await fetch(`${ADMIN_URL}/api/provider-applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const saved = (await response.json()) as ProviderApplication;
      return AUTO_VERIFY_PROVIDERS ? { ...saved, status: "verified" } : saved;
    }
  } catch {
    // Admin Next.js may be offline — keep the local application.
  }
  return local;
}

export async function getProviderApplication(id: string): Promise<ProviderApplication | null> {
  try {
    const response = await fetch(`${ADMIN_URL}/api/provider-applications/${id}`);
    if (!response.ok) return null;
    return (await response.json()) as ProviderApplication;
  } catch {
    return null;
  }
}

export async function findProviderByContact(input: { email?: string; phone?: string }): Promise<ProviderApplication | null> {
  const email = input.email?.trim() || "";
  const phone = (input.phone || "").replace(/\D/g, "");
  if (!email && !phone) return null;
  try {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (phone) params.set("phone", phone);
    const response = await fetch(`${ADMIN_URL}/api/provider-applications?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data) || !data.id) return null;
    return data as ProviderApplication;
  } catch {
    return null;
  }
}

export function applicationToUser(app: ProviderApplication): Partial<AppUser> {
  return {
    id: app.id,
    full_name: app.full_name,
    address: app.address,
    contact: app.contact,
    phone: app.phone,
    email: app.email,
    service_type: app.service_type,
    nagrita_uri: app.nagrita_uri,
    photo_uri: app.photo_uri,
    account_type: "provider",
    verification_status: AUTO_VERIFY_PROVIDERS && app.status !== "rejected" ? "verified" : app.status,
    application_id: app.id,
  };
}
