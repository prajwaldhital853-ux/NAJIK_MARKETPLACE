import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { LINE, ListingGrid, ListingList } from "../components/ClassifiedCard";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { catalogMeta, priceValue, type CatalogItem, type CatalogKey } from "../data/catalog";
import { apiCategoryForKey, listingsToCatalog } from "../data/liveListings";
import { fetchListingFeed } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openMapSearch } from "../navigation/browse";
import { colors } from "../theme";

const GREEN = "#1B7D2C";
const PAD = 16;

type FeedTab = "latest" | "recommended";
type SortKey = "new" | "popular" | "low" | "high";

export function CategoryBrowseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const key: CatalogKey = route.params?.key ?? "property";
  const initialFilter: string = route.params?.filter ?? "All";
  const meta = catalogMeta[key] ?? catalogMeta.property;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState<SortKey>("new");
  const [grid, setGrid] = useState(true);
  const [feed, setFeed] = useState<FeedTab>("latest");
  const [live, setLive] = useState<CatalogItem[]>([]);
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

  const list = useMemo(() => {
    let rows = [...live].filter((item) => {
      if (filter !== "All") {
        const needle = filter.toLowerCase();
        const hit = [...item.tags, ...item.extra, item.badge || ""].some((value) => String(value).toLowerCase() === needle);
        if (!hit) return false;
      }
      return true;
    });
    if (feed === "recommended") rows = [...rows];
    else if (sort === "popular") rows = [...rows].sort((a, b) => (b.rating || 0) - (a.rating || 0) || priceValue(b.price) - priceValue(a.price));
    else if (sort === "low") rows = [...rows].sort((a, b) => priceValue(a.price) - priceValue(b.price));
    else if (sort === "high") rows = [...rows].sort((a, b) => priceValue(b.price) - priceValue(a.price));
    return rows;
  }, [key, query, filter, sort, feed, live]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader onClose={() => navigation.goBack()} showLocation />
      <KeyboardScreen contentStyle={{ paddingBottom: 28 }} style={{ backgroundColor: "#F7F8FA" }}>
        <BrowseBody
          catalogKey={key}
          meta={meta}
          count={list.length}
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
}: {
  catalogKey: CatalogKey;
  meta: (typeof catalogMeta)[CatalogKey];
  count: number;
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

      {list.length === 0 ? (
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
