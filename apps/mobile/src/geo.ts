import * as Location from "expo-location";

export const LAHAN = { lat: 26.7296, lng: 86.4951 };

export type GeoPoint = { lat: number; lng: number };

export function haversineKm(a: GeoPoint, b: GeoPoint) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function formatDistance(km?: number | null) {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function mapsDirectionsUrl(point: GeoPoint) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;
}

export async function reverseGeocode(point: GeoPoint) {
  try {
    const rows = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
    const addr = rows[0];
    if (addr) {
      const city = addr.city || addr.subregion || "";
      const district = addr.district || addr.region || "";
      const location = [addr.streetNumber, addr.street, addr.district, city, addr.region, "Nepal"].filter(Boolean).join(", ");
      if (location || city) return { location: location || city, city, district };
    }
  } catch {
    /* fall through to OpenStreetMap */
  }
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=16&addressdetails=1`;
  const res = await fetch(url, { headers: { "User-Agent": "NAJIK/1.0 (marketplace)" } });
  if (!res.ok) return { location: "", city: "", district: "" };
  const data = await res.json();
  const osm = data.address || {};
  const city = osm.city || osm.town || osm.village || osm.municipality || "";
  const district = osm.county || osm.state_district || osm.district || "";
  const location = data.display_name || [osm.road, city, district, "Nepal"].filter(Boolean).join(", ");
  return { location, city, district };
}

export type PlaceHit = {
  label: string;
  place: string;
  city: string;
  district: string;
  location: string;
  lat: number;
  lng: number;
};

export async function searchPlaces(query: string, limit = 12): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=np&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": "NAJIK/1.0 (marketplace)" } });
  if (!res.ok) return [];
  const rows = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }[];
  const seen = new Set<string>();
  return rows
    .map((row) => {
      const addr = row.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || "";
      const district = addr.county || addr.state_district || addr.district || "";
      const locality = addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet || addr.city_district || addr.road || "";
      const label = row.display_name.split(",").slice(0, 4).map((part) => part.trim()).filter(Boolean).join(", ");
      return {
        label: label || [locality, city || district].filter(Boolean).join(", "),
        place: locality || city || q,
        city,
        district,
        location: row.display_name,
        lat: Number(row.lat),
        lng: Number(row.lon),
      };
    })
    .filter((row) => {
      const key = `${row.label}|${row.lat.toFixed(4)}|${row.lng.toFixed(4)}`;
      if (seen.has(key) || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return false;
      seen.add(key);
      return true;
    });
}

export async function geocodeAddress(query: string) {
  const hits = await searchPlaces(query, 1);
  return hits[0] || null;
}

export async function requestUserPoint(): Promise<GeoPoint | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const last = await Location.getLastKnownPositionAsync();
  if (last && Date.now() - last.timestamp < 10 * 60 * 1000) {
    return { lat: last.coords.latitude, lng: last.coords.longitude };
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
