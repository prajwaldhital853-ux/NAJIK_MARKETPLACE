import Constants from "expo-constants";
import { Platform } from "react-native";

function defaultApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ||
    Constants.expoConfig?.hostUri?.split("/").shift() ||
    "";
  const lanIp = debuggerHost.split(":")[0];
  if (lanIp && lanIp !== "localhost" && lanIp !== "127.0.0.1") {
    return `http://${lanIp}:8000`;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://127.0.0.1:8000";
}

export const API_URL = defaultApiUrl();

/** Rewrite API/media URLs to the app’s configured API host (fixes cached/wrong hosts in feed photos). */
export function resolveApiMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return trimmed;
  const apiBase = API_URL.replace(/\/$/, "");
  if (trimmed.startsWith("/")) return `${apiBase}${trimmed}`;
  try {
    const parsed = new URL(trimmed);
    const path = `${parsed.pathname}${parsed.search}`;
    if (path.startsWith("/api/") || path.startsWith("/media/")) {
      return `${apiBase}${path}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export const ADMIN_URL =
  process.env.EXPO_PUBLIC_ADMIN_URL ?? API_URL.replace(":8000", ":3000");

export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

/** Expo Go uses the Expo auth proxy (must stay in Google Console). */
export const GOOGLE_EXPO_PROXY_REDIRECT = "https://auth.expo.io/@prajwal851/najik";

export function googleCallbackRedirect(apiBase = API_URL) {
  return `${apiBase.replace(/\/$/, "")}/api/auth/google/callback/`;
}

function resolveGoogleRedirectUri() {
  if (process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI) {
    return process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI;
  }
  if (Constants.appOwnership === "expo") {
    return GOOGLE_EXPO_PROXY_REDIRECT;
  }
  return googleCallbackRedirect();
}

export const GOOGLE_REDIRECT_URI = resolveGoogleRedirectUri();

/** EAS project id — required for standalone APK push tokens (Expo Go uses its own). */
export const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  "49a60495-121d-4c8d-92e7-a12340bcc4f6";

/** Providers go straight to verified once documents are submitted; flip off to restore the admin review queue. */
export const AUTO_VERIFY_PROVIDERS = false;
