import AsyncStorage from "@react-native-async-storage/async-storage";
import { type CatalogItem } from "../data/catalog";

const HOME_CACHE_KEY = "@najik_home_cache_v2";
const FRESH_MS = 2 * 60 * 1000;

export type HomeCacheData = {
  latest: CatalogItem[];
  trending: CatalogItem[];
  recommended: CatalogItem[];
  verified: CatalogItem[];
  place?: string;
  timestamp: number;
};

let memoryCache: HomeCacheData | null = null;
let hydratePromise: Promise<HomeCacheData | null> | null = null;

export async function hydrateHomeCache(): Promise<HomeCacheData | null> {
  if (memoryCache) return memoryCache;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(HOME_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as HomeCacheData;
      if (!data?.latest) return null;
      memoryCache = data;
      return data;
    } catch {
      return null;
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}

export function getCachedHomeData(place?: string): HomeCacheData | null {
  if (!memoryCache) return null;
  if (place && memoryCache.place && memoryCache.place !== place) return null;
  return memoryCache;
}

export function isHomeCacheFresh(): boolean {
  return Boolean(memoryCache && Date.now() - memoryCache.timestamp < FRESH_MS);
}

export function setCachedHomeData(data: Omit<HomeCacheData, "timestamp">): void {
  try {
    const cached: HomeCacheData = { ...data, timestamp: Date.now() };
    memoryCache = cached;
    void AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cached));
  } catch {
    memoryCache = { ...data, timestamp: Date.now() };
  }
}

export function clearHomeCache(): void {
  memoryCache = null;
  void AsyncStorage.removeItem(HOME_CACHE_KEY).catch(() => undefined);
}

void hydrateHomeCache();
