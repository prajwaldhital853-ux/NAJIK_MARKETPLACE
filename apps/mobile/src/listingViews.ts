import * as SecureStore from "expo-secure-store";

const KEY = "najik_recent_listing_views";
const MAX = 10;

export async function recordListingView(id: string) {
  if (!id) return;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const next = [id, ...ids.filter((row) => row !== id)].slice(0, MAX);
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export async function getRecentViewIds(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
