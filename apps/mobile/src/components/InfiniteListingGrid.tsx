import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import type { CatalogItem } from "../data/catalog";
import { catalogFromFeed } from "../data/feedOrdering";
import type { ApiListing, FeedResponse } from "../listingsApi";
import { colors, shadow } from "../theme";
import { ClassifiedGridCard, LISTING_CARD_W } from "./ClassifiedCard";

const GAP = 11;
const PAGE_SIZE = 10;

type PageResponse = FeedResponse | ApiListing[] | { results?: ApiListing[]; has_next?: boolean };

type InfiniteListingGridProps = {
  fetchData: (page: number, pageSize: number) => Promise<PageResponse>;
  emptyText?: string;
  loadingText?: string;
  showPromoted?: boolean;
  pageSize?: number;
};

function normalizePage(raw: PageResponse, pageSize: number) {
  const results = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : [];
  const hasNext = Array.isArray(raw) ? results.length >= pageSize : Boolean(raw?.has_next);
  return { items: catalogFromFeed(results), hasNext };
}

export function InfiniteListingGrid({
  fetchData,
  emptyText = "No listings found.",
  loadingText = "Loading listings…",
  showPromoted = false,
  pageSize = PAGE_SIZE,
}: InfiniteListingGridProps) {
  const [data, setData] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const fetchRef = useRef(fetchData);
  const inFlight = useRef(false);
  const pageRef = useRef(1);
  const hasNextRef = useRef(true);
  const idsRef = useRef(new Set<string>());

  fetchRef.current = fetchData;

  const load = useCallback(
    async (reset: boolean) => {
      if (inFlight.current) return;
      if (!reset && !hasNextRef.current) return;
      inFlight.current = true;
      if (reset) {
        setError("");
        if (!data.length) setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const page = reset ? 1 : pageRef.current;
        const raw = await fetchRef.current(page, pageSize);
        const { items, hasNext } = normalizePage(raw, pageSize);
        if (reset) {
          idsRef.current = new Set(items.map((item) => item.id));
          setData(items);
          pageRef.current = 2;
        } else {
          setData((prev) => {
            const next = [...prev];
            for (const item of items) {
              if (idsRef.current.has(item.id)) continue;
              idsRef.current.add(item.id);
              next.push(item);
            }
            return next;
          });
          pageRef.current = page + 1;
        }
        hasNextRef.current = hasNext && items.length > 0;
        setError("");
      } catch {
        if (reset && !data.length) {
          setError("Could not load listings. Pull down to retry.");
        }
      } finally {
        inFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [pageSize, data.length],
  );

  useEffect(() => {
    pageRef.current = 1;
    hasNextRef.current = true;
    idsRef.current = new Set();
    void load(true);
    // First paint only; later pages go through onEndReached / pull-to-refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || !hasNextRef.current || !data.length) return;
    void load(false);
  }, [load, loading, loadingMore]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    hasNextRef.current = true;
    void load(true);
  }, [load]);

  return (
    <FlatList
      data={data}
      numColumns={2}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ width: LISTING_CARD_W, marginBottom: GAP }}>
          <ClassifiedGridCard item={item} width={LISTING_CARD_W} showPromoted={showPromoted} />
        </View>
      )}
      columnWrapperStyle={{ justifyContent: "space-between" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 36, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListFooterComponent={
        loadingMore ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}>
            <ActivityIndicator color={colors.green} />
            <Text style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>Loading more…</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        loading ? (
          <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 24 }}>
            <ActivityIndicator color={colors.green} size="large" />
            <Text style={{ fontWeight: "800", fontSize: 15, color: colors.navy, marginTop: 14 }}>{loadingText}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 }}>Fetching listings for you…</Text>
          </View>
        ) : error ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, ...shadow.card }}>
            <Text style={{ color: colors.red, textAlign: "center", fontWeight: "600" }}>{error}</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, ...shadow.card }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>{emptyText}</Text>
          </View>
        )
      }
      removeClippedSubviews
      maxToRenderPerBatch={8}
      windowSize={8}
      initialNumToRender={6}
    />
  );
}
