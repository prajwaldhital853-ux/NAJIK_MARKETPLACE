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

/** Providers go straight to verified once documents are submitted; flip off to restore the admin review queue. */
export const AUTO_VERIFY_PROVIDERS = true;
