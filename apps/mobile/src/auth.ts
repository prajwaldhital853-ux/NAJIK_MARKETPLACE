import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AppUser } from "./types";

const ACCESS_KEY = "najik_app_access";
const REFRESH_KEY = "najik_app_refresh";
const DEMO_USER_KEY = "najik_demo_user";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    sessionStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === "web") {
    return sessionStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    sessionStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveAppTokens(access: string, refresh: string) {
  await setItem(ACCESS_KEY, access);
  await setItem(REFRESH_KEY, refresh);
}

export async function getAppAccessToken() {
  return getItem(ACCESS_KEY);
}

export async function getAppRefreshToken() {
  return getItem(REFRESH_KEY);
}

export async function clearAppTokens() {
  await deleteItem(ACCESS_KEY);
  await deleteItem(REFRESH_KEY);
  await deleteItem(DEMO_USER_KEY);
}

export async function saveDemoUser(user: AppUser) {
  await setItem(DEMO_USER_KEY, JSON.stringify(user));
}

export async function getDemoUser(): Promise<AppUser | null> {
  const raw = await getItem(DEMO_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}
