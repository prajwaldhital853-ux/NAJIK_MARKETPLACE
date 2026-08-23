import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListingGrid } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { useAuth } from "../context/AuthContext";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { type CatalogItem, type CatalogKey } from "../data/catalog";
import { listingsToCatalog, liveListingById } from "../data/liveListings";
import { rankSimilarListings } from "../data/similarListings";
import { fetchListingFeed, fetchSavedListings, type ApiListing } from "../listingsApi";
import { getRecentViewIds } from "../listingViews";
import { subscribeListingsChanged } from "../listingsRefresh";
import { colors } from "../theme";

type SectionKey = "recommended" | "trending" | "verified" | "latest";
const QUICK_LIMIT = 24;
const FULL_LIMIT = 120;

function buildRecommended(pool: CatalogItem[], seeds: CatalogItem[], excludeIds: Set<string>) {
  const out: CatalogItem[] = [];
  const seen = new Set<string>(excludeIds);
  for (const seed of seeds) {
    const related = rankSimilarListings(pool, seed).filter((row) => !seen.has(row.id) && !row.urgent);
    for (const row of related) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
      if (out.length >= 200) return out;
    }
  }
  for (const row of pool) {
    if (seen.has(row.id) || row.urgent) continue;
    out.push(row);
    if (out.length >= 200) break;
  }
  return out;
}

export function HomeSectionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { feedParams } = useBuyerLocation();
  const section = (route.params?.section as SectionKey) || "trending";
  const catalog = route.params?.catalog as CatalogKey | undefined;
  const title = route.params?.title as string | undefined;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const heading = title || (section === "recommended" ? "Recommended" : section === "verified" ? "By verified sellers" : section === "latest" ? "Latest uploads" : "Trending");

  const load = useCallback(async () => {
    const base = { ...feedParams };
    setLoading(true);
    try {
      if (section === "verified") {
        const quick = await fetchListingFeed({ ...base, verified: true, sort: "new", limit: QUICK_LIMIT }).catch(() => [] as ApiListing[]);
        setItems(listingsToCatalog(quick).filter((row) => row.verified && !row.urgent));
        setLoading(false);
        const rows = await fetchListingFeed({ ...base, verified: true, sort: "new", limit: FULL_LIMIT }).catch(() => [] as ApiListing[]);
        setItems(listingsToCatalog(rows).filter((row) => row.verified && !row.urgent));
        return;
      }
      if (section === "latest") {
        const quick = await fetchListingFeed({ ...base, sort: "new", limit: QUICK_LIMIT }).catch(() => [] as ApiListing[]);
        setItems(listingsToCatalog(quick).filter((row) => !row.urgent));
        setLoading(false);
        const rows = await fetchListingFeed({ ...base, sort: "new", limit: FULL_LIMIT }).catch(() => [] as ApiListing[]);
        setItems(listingsToCatalog(rows).filter((row) => !row.urgent));
        return;
      }
      if (section === "recommended") {
        const quick = await fetchListingFeed({ ...base, sort: "new", limit: QUICK_LIMIT }).catch(() => [] as ApiListing[]);
        setItems(listingsToCatalog(quick).filter((row) => !row.urgent));
        setLoading(false);
        const [popular, latest, saved, recentIds] = await Promise.all([
          fetchListingFeed({ ...base, sort: "popular", limit: FULL_LIMIT }).catch(() => [] as ApiListing[]),
          fetchListingFeed({ ...base, sort: "new", limit: FULL_LIMIT }).catch(() => [] as ApiListing[]),
          user ? fetchSavedListings().catch(() => [] as ApiListing[]) : Promise.resolve([] as ApiListing[]),
          getRecentViewIds(),
        ]);
        const popularItems = listingsToCatalog(popular).filter((row) => !row.urgent);
        const latestItems = listingsToCatalog(latest).filter((row) => !row.urgent);
        const savedItems = listingsToCatalog(saved);
        const exclude = new Set(savedItems.map((row) => row.id));
        const seeds: CatalogItem[] = [];
        for (const id of recentIds) {
          const hit = liveListingById(id) || popularItems.find((row) => row.id === id) || latestItems.find((row) => row.id === id);
          if (hit) seeds.push(hit);
        }
        for (const row of savedItems) {
          if (!seeds.some((s) => s.id === row.id)) seeds.push(row);
        }
        const pool = [...popularItems, ...latestItems];
        setItems(buildRecommended(pool, seeds, exclude));
        return;
      }
      const quick = await fetchListingFeed({ ...base, sort: "popular", limit: QUICK_LIMIT }).catch(() => [] as ApiListing[]);
      let quickPool = listingsToCatalog(quick).filter((row) => !row.urgent);
      if (catalog) {
        quickPool = quickPool.filter((row) => row.key === catalog || (catalog === "used" && row.key === "electronics"));
      }
      setItems(quickPool);
      setLoading(false);
      const rows = await fetchListingFeed({ ...base, sort: "popular", limit: FULL_LIMIT }).catch(() => [] as ApiListing[]);
      let pool = listingsToCatalog(rows).filter((row) => !row.urgent);
      if (catalog) {
        pool = pool.filter((row) => row.key === catalog || (catalog === "used" && row.key === "electronics"));
      }
      pool.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      setItems(pool);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [section, catalog, feedParams, user?.id]);

  useEffect(() => {
    void load();
    return subscribeListingsChanged(() => void load());
  }, [load]);

  const refreshControl = useAppRefreshControl(load);

  const countLabel = useMemo(() => `${items.length} listing${items.length === 1 ? "" : "s"}`, [items.length]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>{heading}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{countLabel}</Text>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={refreshControl}>
        {items.length ? (
          <ListingGrid items={items} />
        ) : loading ? (
          <ActivityIndicator color={colors.greenDeep} style={{ marginTop: 24 }} />
        ) : (
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>No listings in this section yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}
