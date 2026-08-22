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

/** Providers go straight to verified once documents are submitted; flip off to restore the admin review queue. */
export const AUTO_VERIFY_PROVIDERS = false;
