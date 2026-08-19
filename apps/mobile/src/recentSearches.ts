import * as SecureStore from "expo-secure-store";

const KEY = "najik_recent_searches";

export const POPULAR_SEARCHES = ["House for rent", "Used phone", "Jobs in Lahan", "Plumber", "Land for sale"];

export async function loadRecentSearches() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(term: string) {
  const q = term.trim();
  if (!q) return loadRecentSearches();
  const prev = await loadRecentSearches();
  const next = [q, ...prev.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}

export async function removeRecentSearch(term: string) {
  const next = (await loadRecentSearches()).filter((item) => item !== term);
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}
