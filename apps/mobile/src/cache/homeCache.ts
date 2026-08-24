import AsyncStorage from '@react-native-async-storage/async-storage';
import { type CatalogItem } from "../data/catalog";

const HOME_CACHE_KEY = "@najik_home_cache";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

type HomeCacheData = {
  latest: CatalogItem[];
  trending: CatalogItem[];
  recommended: CatalogItem[];
  verified: CatalogItem[];
  timestamp: number;
};

let memoryCache: HomeCacheData | null = null;

export function getCachedHomeData(): HomeCacheData | null {
  // Use memory cache for immediate access
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_EXPIRY_MS) {
    return memoryCache;
  }
  
  // Load from AsyncStorage in background
  void loadCacheFromStorage();
  return memoryCache;
}

async function loadCacheFromStorage() {
  try {
    const cached = await AsyncStorage.getItem(HOME_CACHE_KEY);
    if (!cached) return;
    
    const data: HomeCacheData = JSON.parse(cached);
    if (Date.now() - data.timestamp < CACHE_EXPIRY_MS) {
      memoryCache = data;
    } else {
      void AsyncStorage.removeItem(HOME_CACHE_KEY);
    }
  } catch {
    // Ignore cache errors
  }
}

export function setCachedHomeData(data: Omit<HomeCacheData, 'timestamp'>): void {
  try {
    const cached: HomeCacheData = {
      ...data,
      timestamp: Date.now(),
    };
    memoryCache = cached;
    void AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore cache errors
  }
}

export function clearHomeCache(): void {
  try {
    memoryCache = null;
    void AsyncStorage.removeItem(HOME_CACHE_KEY);
  } catch {
    // Ignore cache errors
  }
}

// Initialize cache on app start
void loadCacheFromStorage();