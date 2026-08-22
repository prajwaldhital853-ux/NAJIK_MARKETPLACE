type DismissPayload = { target?: string; target_id?: string; kind?: string };

let dismissTargetFn: ((payload: DismissPayload) => Promise<void>) | null = null;

export function normTargetId(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/-/g, "");
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
