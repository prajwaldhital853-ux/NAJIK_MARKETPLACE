import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { geocodeAddress, requestUserPoint, reverseGeocode, type GeoPoint } from "../geo";

const KEY = "najik_buyer_place_v3";
const OLD_KEYS = ["najik_buyer_place", "najik_buyer_place_v2"];

export type BuyerPlace = {
  label: string;
  place: string;
  lat: number;
  lng: number;
  radiusKm: number;
  source: "all" | "gps" | "manual";
};

export const ALL_NEPAL: BuyerPlace = {
  label: "All Nepal",
  place: "",
  lat: 28.3949,
  lng: 84.124,
  radiusKm: 500,
  source: "all",
};

type Value = {
  place: BuyerPlace;
  loading: boolean;
  detectCurrent: () => Promise<void>;
  setAllNepal: () => Promise<void>;
  setManual: (next: Omit<BuyerPlace, "source">) => Promise<void>;
  feedParams: { place?: string; lat?: number; lng?: number; radius_km?: number };
};

const Ctx = createContext<Value | null>(null);

function labelFor(city: string, district: string, fallback: string) {
  const parts = [city, district].filter(Boolean);
  return parts.join(", ") || fallback;
}

export function BuyerLocationProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<BuyerPlace>(ALL_NEPAL);
  const [loading, setLoading] = useState(true);

  async function persist(next: BuyerPlace) {
    setPlace(next);
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  }

  async function setAllNepal() {
    await persist(ALL_NEPAL);
    setLoading(false);
  }

  async function detectCurrent() {
    setLoading(true);
    try {
      const point = await requestUserPoint();
      if (!point) {
        await persist(ALL_NEPAL);
        return;
      }
      const geo = await reverseGeocode(point);
      const city = geo.city || geo.district || "Nepal";
      await persist({
        label: labelFor(geo.city, geo.district, city),
        place: city,
        lat: point.lat,
        lng: point.lng,
        radiusKm: 18,
        source: "gps",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all(OLD_KEYS.map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)));
        await SecureStore.setItemAsync(KEY, JSON.stringify(ALL_NEPAL));
      } catch {
        /* keep in-memory default */
      }
      setPlace(ALL_NEPAL);
      setLoading(false);
    })();
  }, []);

  const value = useMemo<Value>(
    () => ({
      place,
      loading,
      detectCurrent,
      setAllNepal,
      setManual: async (next) => {
        await persist({ ...next, source: "manual" });
      },
      feedParams:
        place.source !== "all" && place.place
          ? { place: place.place, lat: place.lat, lng: place.lng, radius_km: place.radiusKm }
          : {},
    }),
    [place, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBuyerLocation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("BuyerLocationProvider missing");
  return ctx;
}

export async function lookupPlace(query: string) {
  const hit = await geocodeAddress(query);
  if (!hit) return null;
  return {
    label: hit.label,
    place: hit.place || hit.city || query.trim(),
    lat: hit.lat,
    lng: hit.lng,
    radiusKm: hit.place && hit.city && hit.place !== hit.city ? 6 : 14,
  } satisfies Omit<BuyerPlace, "source">;
}

export function pointOf(place: BuyerPlace | null): GeoPoint | null {
  if (!place || place.source === "all") return null;
  return { lat: place.lat, lng: place.lng };
}
