import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ReactNode } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../components/AppHeader";
import { LINE, ListingGrid, ListingList } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { OsmWebMap, type MapMarker } from "../components/OsmWebMap";
import { PressScale } from "../components/PressScale";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { catalogMeta, priceValue, type CatalogItem, type CatalogKey } from "../data/catalog";
import { apiCategoryForKey, listingsToCatalog } from "../data/liveListings";
import { formatDistance, haversineKm, LAHAN, requestUserPoint, type GeoPoint } from "../geo";
import { fetchListingFeed, type FeedQuery } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openListing } from "../navigation/browse";
import { saveRecentSearch } from "../recentSearches";
import { colors } from "../theme";

const GREEN = "#1B7D2C";
const RADII = [5, 10, 25, 50];
const SORTS = [
  { id: "new", label: "Recently added" },
  { id: "popular", label: "Popular" },
  { id: "price_asc", label: "Price low to high" },
  { id: "price_desc", label: "Price high to low" },
] as const;

function markerLabel(item: CatalogItem) {
  const n = priceValue(item.price);
  if (!n) return catalogMeta[item.key].title.slice(0, 8);
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(n >= 1000000 ? 1 : 0)}L`;
  if (n >= 1000) return `Rs ${Math.round(n / 1000)}k`;
  return `Rs ${n}`;
}

export function MapSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const initialQ = String(route.params?.q || "");
  const initialKey: CatalogKey | "all" = route.params?.key || "all";

  const [query, setQuery] = useState(initialQ);
  const [view, setView] = useState<"map" | "list" | "grid">(route.params?.view || "map");
  const [categoryKey, setCategoryKey] = useState<CatalogKey | "all">(initialKey);
  const [subcategory, setSubcategory] = useState("");
  const [radiusKm, setRadiusKm] = useState(25);
  const [useRadius, setUseRadius] = useState(true);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("new");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { feedParams, place: buyerPlace } = useBuyerLocation();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [user, setUser] = useState<GeoPoint | null>(null);
  const [center, setCenter] = useState<GeoPoint>(LAHAN);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  const boundsRef = useRef<{ minLat: number; maxLat: number; minLng: number; maxLng: number; lat: number; lng: number } | null>(null);
  const [areaBounds, setAreaBounds] = useState<typeof boundsRef.current>(null);

  useEffect(() => {
    if (buyerPlace && buyerPlace.source !== "all") setCenter({ lat: buyerPlace.lat, lng: buyerPlace.lng });
    else if (buyerPlace?.source === "all") setCenter({ lat: 28.3949, lng: 84.124 });
    void requestUserPoint().then((point) => {
      if (!point) return;
      setUser(point);
    });
  }, [buyerPlace?.lat, buyerPlace?.lng, buyerPlace?.source]);

  const load = useCallback(() => {
    const params: FeedQuery = {
      q: query.trim() || undefined,
      sort,
      min_price: minPrice || undefined,
      max_price: maxPrice || undefined,
      verified: verifiedOnly || undefined,
      min_rating: minRating || undefined,
    };
    if (categoryKey !== "all") params.category = apiCategoryForKey(categoryKey);
    if (subcategory.trim()) params.subcategory = subcategory.trim();
    if (areaBounds) {
      params.min_lat = areaBounds.minLat;
      params.max_lat = areaBounds.maxLat;
      params.min_lng = areaBounds.minLng;
      params.max_lng = areaBounds.maxLng;
    } else if (feedParams.place) {
      params.place = feedParams.place;
      if (useRadius) {
        params.lat = center.lat;
        params.lng = center.lng;
        params.radius_km = radiusKm;
      }
    }
    void fetchListingFeed(params)
      .then((rows) => {
        let next = listingsToCatalog(rows);
        if (categoryKey === "electronics") next = next.filter((item) => item.key === "electronics");
        const origin = user || center;
        next = next.map((item) => ({
          ...item,
          distanceKm: item.lat != null && item.lng != null ? haversineKm(origin, { lat: item.lat, lng: item.lng }) : undefined,
        }));
        if (availableOnly) next = next.filter((item) => item.available);
        setItems(next);
      })
      .catch(() => setItems([]));
  }, [query, categoryKey, subcategory, sort, minPrice, maxPrice, verifiedOnly, minRating, areaBounds, useRadius, radiusKm, center, user, availableOnly, feedParams.place]);

  useEffect(() => {
    load();
    return subscribeListingsChanged(load);
  }, [load]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const nearby = useMemo(() => [...items].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)).slice(0, 12), [items]);
  const refreshControl = useAppRefreshControl(async () => {
    load();
  });

  const markers: MapMarker[] = useMemo(
    () =>
      items
        .filter((item) => item.lat != null && item.lng != null)
        .map((item) => ({
          id: item.id,
          lat: item.lat as number,
          lng: item.lng as number,
          label: markerLabel(item),
          category: item.apiCategory || item.key,
          kind: items.length > 40 ? "category" : "price",
        })),
    [items],
  );

  function runSearch(term = query) {
    const q = term.trim();
    setQuery(q);
    setAreaBounds(null);
    setUseRadius(true);
    if (q) void saveRecentSearch(q);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#E8EEF3" }}>
      <AppHeader onClose={() => navigation.goBack()} showLocation />
      <View style={{ backgroundColor: "#F7F8FA", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: LINE, paddingLeft: 10, height: 44 }}>
          <Ionicons name="search" size={18} color="#9AA0A6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search listings, place, keyword..."
            placeholderTextColor="#9AA0A6"
            returnKeyType="search"
            onSubmitEditing={() => runSearch()}
            style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy }}
          />
          <Pressable onPress={() => setFiltersOpen(true)} style={{ paddingHorizontal: 10 }}>
            <Ionicons name="options-outline" size={20} color={GREEN} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["map", "list", "grid"] as const).map((key) => (
            <PressScale
              key={key}
              onPress={() => setView(key)}
              style={{ flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: view === key ? GREEN : "#fff", borderWidth: 1, borderColor: view === key ? GREEN : LINE }}
            >
              <Text style={{ fontWeight: "800", fontSize: 12, color: view === key ? "#fff" : "#374151" }}>{key === "map" ? "Map" : key === "list" ? "List" : "Grid"}</Text>
            </PressScale>
          ))}
        </View>
      </View>

      {view === "map" ? (
        <View style={{ flex: 1 }}>
          <OsmWebMap
            mode="browse"
            center={center}
            zoom={buyerPlace?.source === "all" ? 7 : 13}
            user={user}
            selectedId={selectedId || undefined}
            markers={markers}
            onSelect={setSelectedId}
            onBounds={(b) => {
              boundsRef.current = b;
              setMoved(true);
            }}
          />
          {moved ? (
            <View style={{ position: "absolute", top: 12, alignSelf: "center", left: 0, right: 0, alignItems: "center" }}>
              <PressScale
                onPress={() => {
                  setAreaBounds(boundsRef.current);
                  setUseRadius(false);
                  setMoved(false);
                  if (boundsRef.current) setCenter({ lat: boundsRef.current.lat, lng: boundsRef.current.lng });
                }}
                style={{ backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 }}
              >
                <Text style={{ fontWeight: "800", fontSize: 12, color: GREEN }}>Search this area</Text>
              </PressScale>
            </View>
          ) : null}
          {selected ? (
            <PressScale
              onPress={() => openListing(navigation, selected.id)}
              style={{ position: "absolute", left: 12, right: 12, bottom: 168, backgroundColor: "#fff", borderRadius: 16, padding: 12, flexDirection: "row", gap: 10 }}
            >
              <CompactCard item={selected} />
            </PressScale>
          ) : null}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#111827", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 10, paddingBottom: insets.bottom + 8, maxHeight: 160 }}>
            <Text style={{ color: "#fff", fontWeight: "800", paddingHorizontal: 14, marginBottom: 8 }}>Nearby results · {items.length}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
              {nearby.map((item) => (
                <PressScale key={item.id} onPress={() => setSelectedId(item.id)} style={{ width: 220, backgroundColor: selectedId === item.id ? "#1B7D2C" : "#1f2937", borderRadius: 12, padding: 10 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }} numberOfLines={1}>{item.title}</Text>
                  <Text style={{ color: "#D1D5DB", fontSize: 11, marginTop: 4 }}>{item.price} · {formatDistance(item.distanceKm) || item.location}</Text>
                </PressScale>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : (
        <ScrollView refreshControl={refreshControl} contentContainerStyle={{ padding: 16, paddingBottom: 32, backgroundColor: "#F7F8FA" }} style={{ backgroundColor: "#F7F8FA" }}>
          <Text style={{ fontWeight: "800", marginBottom: 12 }}>{items.length} listings</Text>
          {view === "grid" ? <ListingGrid items={items} /> : <ListingList items={items} />}
        </ScrollView>
      )}

      <Modal visible={filtersOpen} animationType="none" onRequestClose={() => setFiltersOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 18 }}>Filters</Text>
            <Pressable onPress={() => setFiltersOpen(false)}><Ionicons name="close" size={22} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Label>Category</Label>
            <Wrap>
              {(["all", "property", "vehicles", "jobs", "services", "used", "electronics", "shops", "others"] as const).map((key) => (
                <Chip key={key} label={key === "all" ? "All" : catalogMeta[key].title} on={categoryKey === key} onPress={() => setCategoryKey(key)} />
              ))}
            </Wrap>
            <Label>Subcategory</Label>
            <TextInput value={subcategory} onChangeText={setSubcategory} placeholder="e.g. Phones, House" style={input} />
            <Label>Radius</Label>
            <Wrap>
              <Chip label="Anywhere" on={!useRadius && !areaBounds} onPress={() => { setUseRadius(false); setAreaBounds(null); }} />
              {RADII.map((km) => (
                <Chip key={km} label={`${km} km`} on={useRadius && radiusKm === km} onPress={() => { setUseRadius(true); setRadiusKm(km); setAreaBounds(null); }} />
              ))}
            </Wrap>
            <Label>Price</Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput value={minPrice} onChangeText={setMinPrice} placeholder="Min" keyboardType="numeric" style={[input, { flex: 1 }]} />
              <TextInput value={maxPrice} onChangeText={setMaxPrice} placeholder="Max" keyboardType="numeric" style={[input, { flex: 1 }]} />
            </View>
            <Label>Minimum rating</Label>
            <Wrap>
              {[0, 3, 4, 5].map((n) => (
                <Chip key={n} label={n ? `${n}+` : "Any"} on={minRating === n} onPress={() => setMinRating(n)} />
              ))}
            </Wrap>
            <Label>More</Label>
            <Wrap>
              <Chip label="Verified sellers" on={verifiedOnly} onPress={() => setVerifiedOnly(!verifiedOnly)} />
              <Chip label="Availability listed" on={availableOnly} onPress={() => setAvailableOnly(!availableOnly)} />
            </Wrap>
            <Label>Sort</Label>
            <Wrap>
              {SORTS.map((item) => (
                <Chip key={item.id} label={item.label} on={sort === item.id} onPress={() => setSort(item.id)} />
              ))}
            </Wrap>
            <PressScale onPress={() => { setFiltersOpen(false); load(); }} style={{ marginTop: 18, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>Apply filters</Text>
            </PressScale>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function CompactCard({ item }: { item: CatalogItem }) {
  return (
    <>
      {item.photo ? <Image source={item.photo} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: "#EEF2F3" }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800" }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ color: GREEN, fontWeight: "800", marginTop: 4 }}>{item.price}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
          {item.location} {item.distanceKm != null ? `· ${formatDistance(item.distanceKm)}` : ""}
        </Text>
      </View>
    </>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={{ fontWeight: "800", marginTop: 14, marginBottom: 8 }}>{children}</Text>;
}
function Wrap({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: on ? GREEN : "#F3F4F6" }}>
      <Text style={{ fontWeight: "700", fontSize: 12, color: on ? "#fff" : "#374151" }}>{label}</Text>
    </PressScale>
  );
}
const input = { borderWidth: 1, borderColor: LINE, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 13, color: "#111" };
