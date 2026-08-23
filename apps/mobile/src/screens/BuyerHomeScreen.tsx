import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { ListingGrid } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { MarketplaceSection } from "../components/MarketplaceSection";
import { PressScale } from "../components/PressScale";
import { StaffWarningCard, AccountStatusCard } from "../components/StaffWarningBanner";
import { useAuth } from "../context/AuthContext";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { homeCategoryKey, type CatalogItem, type CatalogKey } from "../data/catalog";
import { listingsToCatalog, liveListingById } from "../data/liveListings";
import { rankSimilarListings } from "../data/similarListings";
import { HomeBannerCarousel } from "../components/HomeBannerCarousel";
import { UrgentSellSection } from "../components/UrgentSellSection";
import { fetchListingFeed, fetchSavedListings, type ApiListing } from "../listingsApi";
import { getRecentViewIds } from "../listingViews";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openCategory, openHomeSection } from "../navigation/browse";
import { colors, shadow } from "../theme";

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 11;
const TILE = (SCREEN_W - PAD * 2 - GAP * 3) / 4;
const GREEN = "#1B7D2C";
const SECTION_LIMIT = 10;
const QUICK_FEED_LIMIT = 16;

const categories: { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }[] = [
  { label: "Property", icon: "home", bg: "#E8F1FE", color: "#1D4ED8" },
  { label: "Vehicles", icon: "car", bg: "#E8F1FE", color: "#1D4ED8" },
  { label: "Jobs", icon: "briefcase", bg: "#FFF1E0", color: "#C2410C" },
  { label: "Services", icon: "construct", bg: "#FFF1E8", color: "#C2410C" },
  { label: "Used Items", icon: "bed", bg: "#EAF8EE", color: "#166534" },
  { label: "Shops", icon: "storefront", bg: "#FDECEC", color: "#DC2626" },
  { label: "Electronics", icon: "phone-portrait", bg: "#EEF4FF", color: "#1D4ED8" },
  { label: "Others", icon: "apps", bg: "#EEF4FF", color: "#1D4ED8" },
];

const TREND_CHIPS: { key: string; label: string; catalog?: CatalogKey }[] = [
  { key: "all", label: "All Products" },
  { key: "property", label: "Real Estate", catalog: "property" },
  { key: "vehicles", label: "Automobiles", catalog: "vehicles" },
  { key: "jobs", label: "Jobs", catalog: "jobs" },
  { key: "services", label: "Services", catalog: "services" },
  { key: "used", label: "Used Items", catalog: "used" },
  { key: "electronics", label: "Electronics", catalog: "electronics" },
];

function buildRecommended(pool: CatalogItem[], seeds: CatalogItem[], excludeIds: Set<string>) {
  const out: CatalogItem[] = [];
  const seen = new Set<string>(excludeIds);
  for (const seed of seeds) {
    const related = rankSimilarListings(pool, seed).filter((row) => !seen.has(row.id) && !row.urgent);
    for (const row of related) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
      if (out.length >= SECTION_LIMIT) return out;
    }
  }
  for (const row of pool) {
    if (seen.has(row.id) || row.urgent) continue;
    out.push(row);
    if (out.length >= SECTION_LIMIT) break;
  }
  return out;
}

export function BuyerHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { place, feedParams } = useBuyerLocation();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [searchRows, setSearchRows] = useState<CatalogItem[]>([]);
  const [trendingRows, setTrendingRows] = useState<CatalogItem[]>([]);
  const [verifiedRows, setVerifiedRows] = useState<CatalogItem[]>([]);
  const [latestRows, setLatestRows] = useState<CatalogItem[]>([]);
  const [recommendedRows, setRecommendedRows] = useState<CatalogItem[]>([]);
  const [trendChip, setTrendChip] = useState("all");
  const [loadingHome, setLoadingHome] = useState(true);

  async function loadSections() {
    const base = { ...feedParams };
    setLoadingHome(true);
    try {
      const quick = await fetchListingFeed({ ...base, sort: "new", limit: QUICK_FEED_LIMIT }).catch(() => [] as ApiListing[]);
      const quickItems = listingsToCatalog(quick).filter((item) => !item.urgent);
      if (quickItems.length) {
        setLatestRows(quickItems);
        setTrendingRows(quickItems);
        setRecommendedRows(quickItems.slice(0, SECTION_LIMIT));
      }
    } finally {
      setLoadingHome(false);
    }

    const [popular, verified, latest, saved, recentIds] = await Promise.all([
      fetchListingFeed({ ...base, sort: "popular", limit: 60 }).catch(() => [] as ApiListing[]),
      fetchListingFeed({ ...base, verified: true, sort: "new", limit: 40 }).catch(() => [] as ApiListing[]),
      fetchListingFeed({ ...base, sort: "new", limit: 60 }).catch(() => [] as ApiListing[]),
      user ? fetchSavedListings().catch(() => [] as ApiListing[]) : Promise.resolve([] as ApiListing[]),
      getRecentViewIds(),
    ]);
    const popularItems = listingsToCatalog(popular).filter((item) => !item.urgent);
    const verifiedItems = listingsToCatalog(verified).filter((item) => item.verified && !item.urgent);
    const latestItems = listingsToCatalog(latest).filter((item) => !item.urgent);
    const savedItems = listingsToCatalog(saved);
    const exclude = new Set(savedItems.map((row) => row.id));
    const seedItems: CatalogItem[] = [];
    for (const id of recentIds) {
      const hit = liveListingById(id) || popularItems.find((row) => row.id === id) || latestItems.find((row) => row.id === id);
      if (hit) seedItems.push(hit);
    }
    for (const row of savedItems) {
      if (!seedItems.some((s) => s.id === row.id)) seedItems.push(row);
    }
    const pool = [...popularItems, ...latestItems];
    const recommended = buildRecommended(pool, seedItems, exclude);

    setTrendingRows(popularItems);
    setVerifiedRows(verifiedItems);
    setLatestRows(latestItems);
    setRecommendedRows(recommended);
  }

  useEffect(() => {
    if (submitted) {
      void fetchListingFeed({ ...feedParams, q: submitted })
        .then((rows) => setSearchRows(listingsToCatalog(rows)))
        .catch(() => setSearchRows([]));
      return;
    }
    void loadSections();
    return subscribeListingsChanged(() => void loadSections());
  }, [submitted, feedParams.place, feedParams.lat, feedParams.lng, feedParams.radius_km, user?.id]);

  const refreshControl = useAppRefreshControl(async () => {
    if (submitted) {
      const rows = await fetchListingFeed({ ...feedParams, q: submitted }).catch(() => []);
      setSearchRows(listingsToCatalog(rows));
    } else {
      await loadSections();
    }
  });

  const trending = useMemo(() => {
    const chip = TREND_CHIPS.find((c) => c.key === trendChip);
    const base = trendingRows;
    const pool =
      chip?.catalog
        ? base.filter((item) => item.key === chip.catalog || (chip.catalog === "used" && item.key === "electronics"))
        : base;
    return [...pool].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, SECTION_LIMIT);
  }, [trendingRows, trendChip]);

  const verifiedSellers = useMemo(() => verifiedRows.slice(0, SECTION_LIMIT), [verifiedRows]);
  const latest = useMemo(() => latestRows.slice(0, SECTION_LIMIT), [latestRows]);
  const recommended = useMemo(() => recommendedRows.slice(0, SECTION_LIMIT), [recommendedRows]);

  function runSearch() {
    setSubmitted(query.trim());
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader showLocation />
      <View style={{ paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 10, backgroundColor: "#F7F8FA", borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 18, paddingLeft: 14, height: 52, ...shadow.card }}>
          <Ionicons name="search" size={18} color="#9AA0A6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${place.source === "all" ? "across Nepal" : `in ${place.label}`}...`}
            placeholderTextColor="#9AA0A6"
            returnKeyType="search"
            onSubmitEditing={runSearch}
            style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy }}
          />
          <PressScale onPress={runSearch} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", margin: 4 }}>
            <Ionicons name="search" size={20} color="#fff" />
          </PressScale>
        </View>
      </View>

      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 28 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AccountStatusCard />
        <StaffWarningCard />

        {!submitted ? <HomeBannerCarousel audience="buyer" /> : null}
        {!submitted ? <UrgentSellSection /> : null}

        <View style={{ marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="grid-outline" size={22} color="#2563EB" />
            <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "900", color: "#111827" }}>Browse categories</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
            {categories.map((item) => (
              <PressScale key={item.label} onPress={() => openCategory(navigation, homeCategoryKey[item.label] ?? "property")} style={{ width: TILE, backgroundColor: item.bg, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 2, alignItems: "center" }}>
                <Ionicons name={item.icon} size={34} color={item.color} />
                <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 4, color: "#111827" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {item.label}
                </Text>
              </PressScale>
            ))}
          </View>
        </View>

        {submitted ? (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>Results in {place.label}</Text>
              <PressScale onPress={() => { setQuery(""); setSubmitted(""); }}>
                <Text style={{ color: GREEN, fontWeight: "700" }}>Clear</Text>
              </PressScale>
            </View>
            {searchRows.length ? <ListingGrid items={searchRows} /> : (
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, ...shadow.card }}>
                <Text style={{ color: colors.muted, textAlign: "center" }}>No matches for “{submitted}”.</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <MarketplaceSection title="Recommended" icon="thumbs-up" iconColor="#2563EB" items={recommended} loading={loadingHome && !recommended.length} onViewMore={() => openHomeSection(navigation, "recommended", { title: "Recommended" })} emptyText={!loadingHome && !recommended.length ? "Browse listings to get personalised picks." : undefined} />
            <MarketplaceSection title="Trending" icon="stats-chart" iconColor="#2563EB" items={trending} loading={loadingHome && !trending.length} chips={TREND_CHIPS.map(({ key, label }) => ({ key, label }))} activeChip={trendChip} onChip={setTrendChip} onViewMore={() => { const chip = TREND_CHIPS.find((c) => c.key === trendChip); openHomeSection(navigation, "trending", { title: chip?.key === "all" ? "Trending" : chip?.label || "Trending", catalog: chip?.catalog }); }} />
            {verifiedSellers.length || loadingHome ? (
              <MarketplaceSection title="By verified sellers" icon="checkmark-circle" iconColor="#2563EB" items={verifiedSellers} loading={loadingHome && !verifiedSellers.length} onViewMore={() => openHomeSection(navigation, "verified", { title: "By verified sellers" })} />
            ) : null}
            <MarketplaceSection title="Latest Uploads" icon="cloud-upload" iconColor="#111827" items={latest} loading={loadingHome && !latest.length} mode="grid" limit={SECTION_LIMIT} onViewMore={() => openHomeSection(navigation, "latest", { title: "Latest uploads" })} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
