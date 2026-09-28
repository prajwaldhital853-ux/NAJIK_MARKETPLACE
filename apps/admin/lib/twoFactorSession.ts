export const PRE_AUTH_KEY = "najik-pre-auth-token";

export function storePreAuthToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PRE_AUTH_KEY, token);
}

export function readPreAuthToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(PRE_AUTH_KEY) ?? "";
}

export function clearPreAuthToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PRE_AUTH_KEY);
}
