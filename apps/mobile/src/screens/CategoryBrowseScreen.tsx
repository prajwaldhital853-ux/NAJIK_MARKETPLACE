import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { LINE, ListingGrid, ListingList } from "../components/ClassifiedCard";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { catalogMeta, priceValue, type CatalogItem, type CatalogKey } from "../data/catalog";
import { buildRecommendedFromFeed } from "../data/feedOrdering";
import { apiCategoryForKey, listingsToCatalog, liveListingById } from "../data/liveListings";
import { getRecentViewIds } from "../listingViews";
import { fetchListingFeed, fetchSavedListings } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openMapSearch } from "../navigation/browse";
import { colors } from "../theme";

const GREEN = "#1B7D2C";
const PAD = 16;

type FeedTab = "latest" | "recommended";
type SortKey = "new" | "popular" | "low" | "high";

function filterByChip(items: CatalogItem[], filter: string) {
  if (filter === "All") return items;
  const needle = filter.toLowerCase();
  return items.filter((item) =>
    [...item.tags, ...item.extra, item.badge || ""].some((value) => String(value).toLowerCase() === needle),
  );
}

function CategoryLoadingBlock({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 56, paddingHorizontal: 32 }}>
      <ActivityIndicator color={GREEN} size="large" />
      <Text style={{ fontWeight: "800", fontSize: 15, color: "#111", marginTop: 16 }}>{label}</Text>
      <Text style={{ color: "#8A8F98", fontSize: 13, textAlign: "center", marginTop: 6 }}>Fetching listings for you…</Text>
    </View>
  );
}

export function CategoryBrowseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const key: CatalogKey = route.params?.key ?? "property";
  const initialFilter: string = route.params?.filter ?? "All";
  const meta = catalogMeta[key] ?? catalogMeta.property;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState<SortKey>("new");
  const [grid, setGrid] = useState(true);
  const [feed, setFeed] = useState<FeedTab>("latest");
  const [live, setLive] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [seedItems, setSeedItems] = useState<CatalogItem[]>([]);
  const { feedParams } = useBuyerLocation();

  useEffect(() => {
    setFilter(route.params?.filter ?? "All");
    setQuery("");
    setSort("new");
    setFeed("latest");
  }, [key, route.params?.filter]);

  useEffect(() => {
    const category = apiCategoryForKey(key);
    let cancelled = false;
    setLoading(true);
    const load = () => {
      void fetchListingFeed({
        category,
        q: query.trim() || undefined,
        ...feedParams,
      })
        .then((rows) => {
          if (cancelled) return;
          const items = listingsToCatalog(rows);
          setLive(key === "electronics" ? items.filter((item) => item.key === "electronics") : items);
        })
        .catch(() => {
          if (!cancelled) setLive([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    const t = setTimeout(load, 280);
    const stop = subscribeListingsChanged(load);
    return () => {
      cancelled = true;
      clearTimeout(t);
      stop();
    };
  }, [key, query, feedParams.place, feedParams.lat, feedParams.lng, feedParams.radius_km]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [recentIds, saved] = await Promise.all([
        getRecentViewIds(),
        user ? fetchSavedListings().catch(() => []) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      const seeds: CatalogItem[] = [];
      for (const id of recentIds) {
        const hit = liveListingById(id) || live.find((row) => row.id === id);
        if (hit) seeds.push(hit);
      }
      for (const row of listingsToCatalog(saved)) {
        if (!seeds.some((seed) => seed.id === row.id)) seeds.push(row);
      }
      setSeedItems(seeds);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, key, live]);

  useEffect(() => {
    setSectionLoading(true);
    const t = setTimeout(() => setSectionLoading(false), 220);
    return () => clearTimeout(t);
  }, [feed, filter, sort]);

  const list = useMemo(() => {
    let rows = filterByChip(live, filter);
    if (feed === "recommended") {
      const exclude = new Set(seedItems.map((row) => row.id));
      const picks = buildRecommendedFromFeed(rows, live, seedItems, exclude, 120);
      return key === "electronics" ? picks.filter((item) => item.key === "electronics") : picks;
    }
    if (sort === "popular") rows = [...rows].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0) || (b.rating || 0) - (a.rating || 0));
    else if (sort === "low") rows = [...rows].sort((a, b) => priceValue(a.price) - priceValue(b.price));
    else if (sort === "high") rows = [...rows].sort((a, b) => priceValue(b.price) - priceValue(a.price));
    return rows;
  }, [key, filter, sort, feed, live, seedItems]);

  const loadingLabel =
    feed === "recommended" ? "Loading recommendations…" : sectionLoading && !loading ? "Loading section…" : "Loading category…";

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader onClose={() => navigation.goBack()} showLocation />
      <KeyboardScreen contentStyle={{ paddingBottom: 28 }} style={{ backgroundColor: "#F7F8FA" }}>
        <BrowseBody
          catalogKey={key}
          meta={meta}
          count={loading || sectionLoading ? "…" : String(list.length)}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          sort={sort}
          setSort={setSort}
          grid={grid}
          setGrid={setGrid}
          feed={feed}
          setFeed={setFeed}
          list={list}
          loading={loading || sectionLoading}
          loadingLabel={loadingLabel}
        />
      </KeyboardScreen>
    </View>
  );
}

function BrowseBody({
  catalogKey,
  meta,
  count,
  query,
  setQuery,
  filter,
  setFilter,
  sort,
  setSort,
  grid,
  setGrid,
  feed,
  setFeed,
  list,
  loading,
  loadingLabel,
}: {
  catalogKey: CatalogKey;
  meta: (typeof catalogMeta)[CatalogKey];
  count: string;
  query: string;
  setQuery: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  grid: boolean;
  setGrid: (v: boolean) => void;
  feed: FeedTab;
  setFeed: (v: FeedTab) => void;
  list: CatalogItem[];
  loading: boolean;
  loadingLabel: string;
}) {
  const { onInputFocus } = useKeyboardScroll();
  const navigation = useNavigation<any>();

  return (
    <>
      <View style={{ paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ flex: 1, fontWeight: "800", fontSize: 20, color: "#111" }}>{meta.title}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>{count} ads</Text>
      </View>

      <View style={{ paddingHorizontal: PAD, paddingTop: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F7F7F7",
            borderRadius: 8,
            paddingLeft: 12,
            height: 44,
            borderWidth: 1,
            borderColor: LINE,
          }}
        >
          <Ionicons name="search" size={18} color="#9AA0A6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${meta.title.toLowerCase()}...`}
            placeholderTextColor="#9AA0A6"
            onFocus={onInputFocus}
            style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy }}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: PAD, paddingTop: 12, gap: 8 }}>
        {meta.filters.map((chip) => {
          const on = chip === filter;
          return (
            <PressScale
              key={chip}
              onPress={() => setFilter(chip)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 4,
                backgroundColor: on ? GREEN : "#F3F4F6",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 12, color: on ? "#fff" : "#374151" }}>{chip}</Text>
            </PressScale>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINE }}>
        <FeedTabBtn
          icon="cloud-upload-outline"
          label="Latest Uploads"
          on={feed === "latest"}
          onPress={() => {
            setFeed("latest");
            setSort("new");
          }}
        />
        <FeedTabBtn
          icon="thumbs-up-outline"
          label="Recommended"
          on={feed === "recommended"}
          onPress={() => setFeed("recommended")}
        />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setSort(sort === "low" ? "high" : sort === "high" ? "popular" : sort === "popular" ? "new" : "low")}
          hitSlop={8}
          style={{ padding: 10 }}
        >
          <Ionicons name="swap-vertical-outline" size={18} color="#6B7280" />
        </Pressable>
        <Pressable onPress={() => openMapSearch(navigation, { key: catalogKey, q: query })} hitSlop={8} style={{ padding: 10 }}>
          <Ionicons name="map-outline" size={18} color="#111" />
        </Pressable>
        <Pressable onPress={() => setGrid(!grid)} hitSlop={8} style={{ padding: 10 }}>
          <Ionicons name={grid ? "list-outline" : "grid-outline"} size={18} color="#111" />
        </Pressable>
      </View>

      {feed === "recommended" && !loading ? (
        <Text style={{ color: "#6B7280", fontSize: 12, paddingHorizontal: PAD, paddingTop: 12, lineHeight: 18 }}>
          Picks based on your recent views, saved listings, and what is popular in {meta.title.toLowerCase()}.
        </Text>
      ) : null}

      {loading ? (
        <CategoryLoadingBlock label={loadingLabel} />
      ) : list.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
          <Ionicons name={meta.icon} size={36} color="#C4C7CC" />
          <Text style={{ fontWeight: "800", fontSize: 16, color: "#111", marginTop: 14 }}>No ads found</Text>
          <Text style={{ color: "#8A8F98", fontSize: 13, textAlign: "center", marginTop: 6 }}>Try another filter or search nearby.</Text>
          <PressScale
            onPress={() => {
              setFilter("All");
              setQuery("");
            }}
            style={{ marginTop: 14, backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Clear filters</Text>
          </PressScale>
        </View>
      ) : (
        <View style={{ paddingHorizontal: PAD, paddingTop: 14 }}>
          {grid ? <ListingGrid items={list} /> : <ListingList items={list} />}
        </View>
      )}
    </>
  );
}

function FeedTabBtn({
  icon,
  label,
  on,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={15} color={on ? "#111" : "#9AA0A6"} />
        <Text style={{ fontWeight: on ? "700" : "600", fontSize: 13, color: on ? "#111" : "#9AA0A6" }}>{label}</Text>
      </View>
      <View style={{ height: 3, width: "100%", backgroundColor: on ? "#111" : "transparent", marginTop: 8, borderRadius: 1 }} />
    </Pressable>
  );
}
