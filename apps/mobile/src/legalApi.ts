import { API_URL } from "./config";
import type { LegalDocId, LegalDocument, LegalRole } from "./legal/types";
import { getLegalDocument as getBundledLegalDocument } from "./legal/legalDocuments";

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; doc: LegalDocument }>();

function cacheKey(id: LegalDocId, role: LegalRole) {
  return `${id}:${role}`;
}

export async function fetchLegalDocument(id: LegalDocId, role: LegalRole): Promise<LegalDocument> {
  if (id !== "terms" && id !== "privacy") {
    return getBundledLegalDocument(id, role);
  }
  const key = cacheKey(id, role);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.doc;
  try {
    const res = await fetch(`${API_URL}/api/app-control/legal/${id}/?role=${encodeURIComponent(role)}`);
    if (!res.ok) throw new Error("legal fetch failed");
    const data = (await res.json()) as LegalDocument;
    cache.set(key, { at: Date.now(), doc: data });
    return data;
  } catch {
    return getBundledLegalDocument(id, role);
  }
}

export type PrivacyRetentionPublic = {
  summary: string;
  inactive_account_retention_days: number;
  kyc_retention_days_after_deletion: number;
  chat_message_retention_days: number;
  allow_self_service_export: boolean;
  allow_self_service_delete: boolean;
};

export async function fetchPrivacyRetentionPublic(): Promise<PrivacyRetentionPublic | null> {
  try {
    const res = await fetch(`${API_URL}/api/app-control/privacy-retention/`);
    if (!res.ok) return null;
    return (await res.json()) as PrivacyRetentionPublic;
  } catch {
    return null;
  }
}
