import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ProviderApplication } from "./provider-types";

export type { ProviderApplication } from "./provider-types";

/** Providers are approved on submission for now; flip off to restore manual admin review. */
export const AUTO_VERIFY_PROVIDERS = true;

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "provider-applications.json");

async function ensureFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, "[]", "utf8");
  }
}

export async function listApplications(): Promise<ProviderApplication[]> {
  await ensureFile();
  const raw = await readFile(dataFile, "utf8");
  return JSON.parse(raw) as ProviderApplication[];
}

export async function saveApplications(items: ProviderApplication[]) {
  await ensureFile();
  await writeFile(dataFile, JSON.stringify(items, null, 2), "utf8");
}

export async function addApplication(
  payload: Omit<ProviderApplication, "id" | "status" | "created_at">,
): Promise<ProviderApplication> {
  const items = await listApplications();
  const item: ProviderApplication = {
    ...payload,
    id: `app_${Date.now()}`,
    status: AUTO_VERIFY_PROVIDERS ? "verified" : "pending",
    created_at: new Date().toISOString(),
  };
  items.unshift(item);
  await saveApplications(items);
  return item;
}

export async function getApplication(id: string) {
  const items = await listApplications();
  return items.find((item) => item.id === id) || null;
}

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "").replace(/^977/, "");
}

export async function findApplicationByContact(input: { email?: string | null; phone?: string | null }) {
  const email = (input.email || "").trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  if (!email && !phone) return null;

  const items = await listApplications();
  const matches = items.filter((item) => {
    const itemEmail = (item.email || "").trim().toLowerCase();
    const itemPhone = normalizePhone(item.phone);
    return (email && itemEmail === email) || (phone && itemPhone === phone);
  });
  if (!matches.length) return null;

  const rank: Record<ProviderApplication["status"], number> = {
    verified: 0,
    pending: 1,
    rejected: 2,
    none: 3,
  };
  matches.sort((a, b) => rank[a.status] - rank[b.status] || b.created_at.localeCompare(a.created_at));
  return matches[0];
}

export async function setApplicationStatus(id: string, status: ProviderApplication["status"]) {
  const items = await listApplications();
  const next = items.map((item) => (item.id === id ? { ...item, status } : item));
  await saveApplications(next);
  return next.find((item) => item.id === id) || null;
}
