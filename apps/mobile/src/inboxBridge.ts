type DismissPayload = { target?: string; target_id?: string; kind?: string };

let dismissTargetFn: ((payload: DismissPayload) => Promise<void>) | null = null;

export function normTargetId(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/-/g, "");
}

/** Restore a standard UUID from inbox target_id (hyphens may have been stripped). */
export function uuidFromNorm(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("-")) return raw;
  const hex = normTargetId(raw);
  if (hex.length !== 32 || !/^[0-9a-f]{32}$/.test(hex)) return raw;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function registerInboxDismissTarget(fn: ((payload: DismissPayload) => Promise<void>) | null) {
  dismissTargetFn = fn;
}

export async function dismissInboxTargetOnVisit(payload: DismissPayload) {
  if (!dismissTargetFn) return;
  const normalized: DismissPayload = {
    ...payload,
    target_id: payload.target_id ? normTargetId(payload.target_id) : undefined,
  };
  try {
    await dismissTargetFn(normalized);
  } catch {
    /* refresh on next poll */
  }
}
