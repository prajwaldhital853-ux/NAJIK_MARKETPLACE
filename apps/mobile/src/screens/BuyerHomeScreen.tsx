import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { ClassifiedGridCard, LISTING_CARD_W } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { MarketplaceSection } from "../components/MarketplaceSection";
import { PressScale } from "../components/PressScale";
import { ProductSkeleton } from "../components/ProductSkeleton";
import { StaffWarningCard, AccountStatusCard } from "../components/StaffWarningBanner";
import { useAuth } from "../context/AuthContext";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { homeCategoryKey, type CatalogItem, type CatalogKey } from "../data/catalog";
import { catalogFromFeed, buildRecommendedFromFeed, prioritizePromoted } from "../data/feedOrdering";
import { listingsToCatalog, liveListingById } from "../data/liveListings";
import { HomeBannerCarousel } from "../components/HomeBannerCarousel";
import { UrgentSellSection } from "../components/UrgentSellSection";
import { fetchListingFeed, fetchListingFeedPaginated, fetchSavedListings, type ApiListing } from "../listingsApi";
import { getCachedHomeData, hydrateHomeCache, setCachedHomeData } from "../cache/homeCache";
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
const PAGE_SIZE = 10;

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

function mergeUnique(prev: CatalogItem[], extra: CatalogItem[]) {
  const seen = new Set(prev.map((row) => row.id));
  const out = [...prev];
  for (const row of extra) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
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
  const [latestPage, setLatestPage] = useState(1);
  const [latestHasMore, setLatestHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  async function loadSections() {
    const base = { ...feedParams };
    await hydrateHomeCache();
    const cachedData = getCachedHomeData(feedParams.place);
    if (cachedData?.latest?.length) {
      setLatestRows(cachedData.latest);
      setTrendingRows(cachedData.trending);
      setRecommendedRows(cachedData.recommended);
      setVerifiedRows(cachedData.verified);
      setLoadingHome(false);
    } else {
      setLoadingHome(true);
    }

    try {
      const firstPage = await fetchListingFeedPaginated({ ...base, sort: "new", page: 1, page_size: PAGE_SIZE }).catch(
        () => ({ results: [] as ApiListing[], page: 1, page_size: PAGE_SIZE, has_next: false }),
      );
      const firstItems = catalogFromFeed(firstPage.results);
      setLatestRows(firstItems);
      setLatestPage(1);
      setLatestHasMore(Boolean(firstPage.has_next));
      if (firstItems.length) {
        setTrendingRows((prev) => (prev.length ? prev : firstItems));
        setRecommendedRows((prev) => (prev.length ? prev : firstItems.slice(0, SECTION_LIMIT)));
        setLoadingHome(false);
        setCachedHomeData({
          latest: firstItems,
          trending: firstItems,
          recommended: firstItems.slice(0, SECTION_LIMIT),
          verified: [],
          place: feedParams.place,
        });
      }

      const [popular, verified, saved, recentIds] = await Promise.all([
        fetchListingFeed({ ...base, sort: "popular", page_size: PAGE_SIZE }).catch(() => [] as ApiListing[]),
        fetchListingFeed({ ...base, verified: true, sort: "new", page_size: PAGE_SIZE }).catch(() => [] as ApiListing[]),
        user ? fetchSavedListings().catch(() => [] as ApiListing[]) : Promise.resolve([] as ApiListing[]),
        getRecentViewIds(),
      ]);
      const popularItems = catalogFromFeed(popular);
      const verifiedItems = catalogFromFeed(verified).filter((item) => item.verified);
      const savedItems = listingsToCatalog(saved);
      const exclude = new Set(savedItems.map((row) => row.id));
      const seedItems: CatalogItem[] = [];
      for (const id of recentIds) {
        const hit = liveListingById(id) || popularItems.find((row) => row.id === id) || firstItems.find((row) => row.id === id);
        if (hit) seedItems.push(hit);
      }
      for (const row of savedItems) {
        if (!seedItems.some((s) => s.id === row.id)) seedItems.push(row);
      }
      const pool = [...popularItems, ...firstItems];
      const recommended = buildRecommendedFromFeed(firstItems, pool, seedItems, exclude, SECTION_LIMIT);

      setTrendingRows(prioritizePromoted(popularItems.length ? popularItems : firstItems));
      setVerifiedRows(prioritizePromoted(verifiedItems));
      setRecommendedRows(recommended);
      setCachedHomeData({
        latest: firstItems,
        trending: popularItems.length ? popularItems : firstItems,
        recommended,
        verified: verifiedItems,
        place: feedParams.place,
      });
    } catch (error) {
      console.error("Error loading sections:", error);
    } finally {
      setLoadingHome(false);
    }
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
    const pool = chip?.catalog
      ? base.filter((item) => item.key === chip.catalog || (chip.catalog === "used" && item.key === "electronics"))
      : base;
    return pool.slice(0, SECTION_LIMIT);
  }, [trendingRows, trendChip]);

  const verifiedSellers = useMemo(() => verifiedRows.slice(0, SECTION_LIMIT), [verifiedRows]);
  const recommended = useMemo(() => recommendedRows.slice(0, SECTION_LIMIT), [recommendedRows]);

  async function loadMoreLatest() {
    if (loadingHome || loadingMoreRef.current || !latestHasMore || submitted) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = latestPage + 1;
      const response = await fetchListingFeedPaginated({
        ...feedParams,
        sort: "new",
        page: nextPage,
        page_size: PAGE_SIZE,
      });
      const moreItems = catalogFromFeed(response.results);
      setLatestRows((prev) => mergeUnique(prev, moreItems));
      setLatestPage(nextPage);
      setLatestHasMore(Boolean(response.has_next) && moreItems.length > 0);
    } catch {
      // Keep current rows; user can scroll again.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  function runSearch() {
    setSubmitted(query.trim());
  }

  const listHeader = (
    <View>
      <AccountStatusCard />
      <StaffWarningCard />
      <HomeBannerCarousel audience="buyer" />
      <UrgentSellSection />

      <View style={{ marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Ionicons name="grid-outline" size={22} color="#2563EB" />
          <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "900", color: "#111827" }}>Browse categories</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
          {categories.map((item) => (
            <PressScale
              key={item.label}
              onPress={() => openCategory(navigation, homeCategoryKey[item.label] ?? "property")}
              style={{ width: TILE, backgroundColor: item.bg, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 2, alignItems: "center" }}
            >
              <Ionicons name={item.icon} size={34} color={item.color} />
              <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 4, color: "#111827" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {item.label}
              </Text>
            </PressScale>
          ))}
        </View>
      </View>

      <MarketplaceSection
        title="Recommended"
        icon="thumbs-up"
        iconColor="#2563EB"
        items={recommended}
        loading={loadingHome && !recommended.length}
        onViewMore={() => openHomeSection(navigation, "recommended", { title: "Recommended" })}
        emptyText={!loadingHome && !recommended.length ? "Browse listings to get personalised picks." : undefined}
      />
      <MarketplaceSection
        title="Trending"
        icon="stats-chart"
        iconColor="#2563EB"
        items={trending}
        loading={loadingHome && !trending.length}
        chips={TREND_CHIPS.map(({ key, label }) => ({ key, label }))}
        activeChip={trendChip}
        onChip={setTrendChip}
        onViewMore={() => {
          const chip = TREND_CHIPS.find((c) => c.key === trendChip);
          openHomeSection(navigation, "trending", {
            title: chip?.key === "all" ? "Trending" : chip?.label || "Trending",
            catalog: chip?.catalog,
          });
        }}
      />
      {verifiedSellers.length || loadingHome ? (
        <MarketplaceSection
          title="By verified sellers"
          icon="checkmark-circle"
          iconColor="#2563EB"
          items={verifiedSellers}
          loading={loadingHome && !verifiedSellers.length}
          onViewMore={() => openHomeSection(navigation, "verified", { title: "By verified sellers" })}
        />
      ) : null}

      <View style={{ marginTop: 16, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="cloud-upload" size={22} color="#111827" />
        <Text style={{ marginLeft: 8, flex: 1, fontSize: 18, fontWeight: "800", color: "#111827" }}>Latest Uploads</Text>
        <PressScale onPress={() => openHomeSection(navigation, "latest", { title: "Latest uploads" })}>
          <Text style={{ color: "#2563EB", fontWeight: "800", fontSize: 13 }}>View All ›</Text>
        </PressScale>
      </View>
    </View>
  );

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

      {submitted ? (
        <FlatList
          data={searchRows}
          numColumns={2}
          key="search"
          keyExtractor={(item) => item.id}
          refreshControl={refreshControl}
          contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 28 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          ListHeaderComponent={
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>Results in {place.label}</Text>
              <PressScale onPress={() => { setQuery(""); setSubmitted(""); }}>
                <Text style={{ color: GREEN, fontWeight: "700" }}>Clear</Text>
              </PressScale>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ width: LISTING_CARD_W, marginBottom: GAP }}>
              <ClassifiedGridCard item={item} width={LISTING_CARD_W} />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, ...shadow.card }}>
              <Text style={{ color: colors.muted, textAlign: "center" }}>No matches for “{submitted}”.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={latestRows}
          numColumns={2}
          key="home"
          keyExtractor={(item) => item.id}
          refreshControl={refreshControl}
          contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 28, flexGrow: 1 }}
          columnWrapperStyle={latestRows.length ? { justifyContent: "space-between" } : undefined}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <View style={{ width: LISTING_CARD_W, marginBottom: GAP }}>
              <ClassifiedGridCard item={item} width={LISTING_CARD_W} />
            </View>
          )}
          onEndReached={() => void loadMoreLatest()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <ActivityIndicator color={GREEN} />
                <Text style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>Loading more…</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            loadingHome ? (
              <ProductSkeleton count={6} />
            ) : (
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, ...shadow.card }}>
                <Text style={{ color: colors.muted, textAlign: "center" }}>No listings yet. Pull to refresh.</Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={8}
          initialNumToRender={6}
        />
      )}
    </View>
  );
}
