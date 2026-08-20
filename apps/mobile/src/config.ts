import { Platform } from "react-native";

function defaultApiUrl() {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://127.0.0.1:8000";
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl();

export const ADMIN_URL =
  process.env.EXPO_PUBLIC_ADMIN_URL ?? API_URL.replace(":8000", ":3000");

export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
export const GOOGLE_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI ?? "https://auth.expo.io/@prajwal851/najik";

/** Providers go straight to verified once documents are submitted; flip off to restore the admin review queue. */
export const AUTO_VERIFY_PROVIDERS = false;
