const RECOVER_SETUP_KEY = "najik-recover-2fa-setup";

export type RecoverSetupPayload = {
  qrCodeDataUrl?: string;
  secret?: string;
  otpauthUrl?: string;
};

export function storeRecoverSetup(payload: RecoverSetupPayload) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RECOVER_SETUP_KEY, JSON.stringify(payload));
}

export function readRecoverSetup(): RecoverSetupPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RECOVER_SETUP_KEY);
    return raw ? (JSON.parse(raw) as RecoverSetupPayload) : null;
  } catch {
    return null;
  }
}

export function clearRecoverSetup() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RECOVER_SETUP_KEY);
}

export function isRecoverSetupRoute() {
  if (typeof window === "undefined") return false;
  return window.location.search.includes("recover=1");
}
