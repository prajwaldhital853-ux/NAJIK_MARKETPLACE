import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from "./config";

export function googleAuthUrl(redirectUri = GOOGLE_REDIRECT_URI) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function googleResultFromUrl(url: string, redirectUri = GOOGLE_REDIRECT_URI): { code?: string; error?: string } | null {
  if (!url) return null;
  const base = redirectUri.replace(/\/$/, "");
  const normalized = url.replace(/#/, "?");
  if (!normalized.startsWith(base)) return null;

  const queryStart = normalized.indexOf("?");
  const query = queryStart >= 0 ? normalized.slice(queryStart + 1) : "";
  if (!query) return null;

  const params = new URLSearchParams(query);
  const code = params.get("code") || undefined;
  const error = params.get("error") || undefined;
  if (!code && !error) return null;
  return { code, error };
}

export function isGoogleRedirectUrl(url: string, redirectUri = GOOGLE_REDIRECT_URI) {
  return Boolean(url && googleResultFromUrl(url, redirectUri));
}
