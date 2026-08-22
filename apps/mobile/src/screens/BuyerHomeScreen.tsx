import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, Image, ScrollView, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { ListingGrid } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { MarketplaceSection } from "../components/MarketplaceSection";
import { PressScale } from "../components/PressScale";
import { StaffWarningCard, AccountStatusCard } from "../components/StaffWarningBanner";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { homeCategoryKey, type CatalogItem, type CatalogKey } from "../data/catalog";
import { listingsToCatalog } from "../data/liveListings";
import { fetchHomeBanner } from "../homeBannerApi";
import { fetchListingFeed } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openCategory } from "../navigation/browse";
import { colors, shadow } from "../theme";

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 11;
const TILE = (SCREEN_W - PAD * 2 - GAP * 3) / 4;
const GREEN = "#1B7D2C";
const BANNER_HEIGHT = 156;

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

export function BuyerHomeScreen() {
  const navigation = useNavigation<any>();
  const { place, feedParams } = useBuyerLocation();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [live, setLive] = useState<CatalogItem[]>([]);
  const [trendChip, setTrendChip] = useState("all");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchHomeBanner()
      .then((row) => setBannerUrl(row.image_url || null))
      .catch(() => setBannerUrl(null));
  }, []);

  useEffect(() => {
    const load = () => {
      void fetchListingFeed({ ...feedParams, q: submitted || undefined })
        .then((rows) => setLive(listingsToCatalog(rows)))
        .catch(() => setLive([]));
    };
    load();
    return subscribeListingsChanged(load);
  }, [submitted, feedParams.place, feedParams.lat, feedParams.lng, feedParams.radius_km]);

  const refreshControl = useAppRefreshControl(async () => {
    const rows = await fetchListingFeed({ ...feedParams, q: submitted || undefined }).catch(() => []);
    setLive(listingsToCatalog(rows));
    const banner = await fetchHomeBanner().catch(() => ({ image_url: null }));
    setBannerUrl(banner.image_url || null);
  });

  const recommended = useMemo(() => {
    const featured = live.filter((item) => item.badge === "FEATURED" || item.badge === "VERIFIED" || item.verified);
    return (featured.length ? featured : live).slice(0, 8);
  }, [live]);

  const verifiedSellers = useMemo(
    () => live.filter((item) => item.verified || item.badge === "VERIFIED").slice(0, 8),
    [live],
  );

  const trending = useMemo(() => {
    const chip = TREND_CHIPS.find((c) => c.key === trendChip);
    const pool = chip?.catalog ? live.filter((item) => item.key === chip.catalog || (chip.catalog === "used" && item.key === "electronics")) : live;
    return pool.slice(0, 10);
  }, [live, trendChip]);

  const latest = useMemo(() => live, [live]);

  function runSearch() {
    setSubmitted(query.trim());
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader showLocation />
      <View style={{ paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 10, backgroundColor: "#F7F8FA", borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 18,
            paddingLeft: 14,
            height: 52,
            ...shadow.card,
          }}
        >
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
          <PressScale
            onPress={runSearch}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: GREEN,
              alignItems: "center",
              justifyContent: "center",
              margin: 4,
            }}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </PressScale>
        </View>
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AccountStatusCard />
        <StaffWarningCard />

        {!submitted && bannerUrl ? (
          <View style={{ marginBottom: 14, height: BANNER_HEIGHT, borderRadius: 18, overflow: "hidden", ...shadow.card }}>
            <Image source={{ uri: bannerUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
          {categories.map((item) => (
            <PressScale
              key={item.label}
              onPress={() => openCategory(navigation, homeCategoryKey[item.label] ?? "property")}
              style={{
                width: TILE,
                backgroundColor: item.bg,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 2,
                alignItems: "center",
              }}
            >
              <Ionicons name={item.icon} size={34} color={item.color} />
              <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 4, color: "#111827" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {item.label}
              </Text>
            </PressScale>
          ))}
        </View>

        {submitted ? (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>Results in {place.label}</Text>
              <PressScale
                onPress={() => {
                  setQuery("");
                  setSubmitted("");
                }}
              >
                <Text style={{ color: GREEN, fontWeight: "700" }}>Clear</Text>
              </PressScale>
            </View>
            {live.length ? (
              <ListingGrid items={live} />
            ) : (
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, ...shadow.card }}>
                <Text style={{ color: colors.muted, textAlign: "center" }}>
                  No matches for “{submitted}”. Try a related word like apartment, car, or bike.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <MarketplaceSection
              title="Recommended"
              icon="thumbs-up"
              iconColor="#2563EB"
              items={recommended}
              onViewMore={() => openCategory(navigation, "property")}
              emptyText={live.length ? undefined : place.source === "all" ? "No listings yet." : `No listings in ${place.label} yet.`}
            />

            <MarketplaceSection
              title="Trending"
              icon="stats-chart"
              iconColor="#2563EB"
              items={trending}
              chips={TREND_CHIPS.map(({ key, label }) => ({ key, label }))}
              activeChip={trendChip}
              onChip={setTrendChip}
              onViewMore={() => {
                const chip = TREND_CHIPS.find((c) => c.key === trendChip);
                openCategory(navigation, chip?.catalog || "property");
              }}
            />

            {verifiedSellers.length ? (
              <MarketplaceSection
                title="By verified sellers"
                icon="checkmark-circle"
                iconColor="#2563EB"
                items={verifiedSellers}
                onViewMore={() => openCategory(navigation, "property")}
              />
            ) : null}

            <MarketplaceSection
              title="Latest Uploads"
              icon="cloud-upload"
              iconColor="#111827"
              items={latest}
              mode="grid"
              onViewMore={() => openCategory(navigation, "property")}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
