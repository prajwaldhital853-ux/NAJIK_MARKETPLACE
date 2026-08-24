import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { type CatalogItem } from "../data/catalog";
import { catalogFromFeed, type ApiListing } from "../listingsApi";
import { colors, shadow } from "../theme";
import { ClassifiedGridCard, LISTING_CARD_W } from "./ClassifiedCard";

const GAP = 11;

type InfiniteListingGridProps = {
  fetchData: (page: number, page_size: number) => Promise<{ results: ApiListing[]; has_next: boolean }>;
  initialData?: CatalogItem[];
  showPromoted?: boolean;
  emptyText?: string;
  numColumns?: number;
  pageSize?: number;
};

export function InfiniteListingGrid({
  fetchData,
  initialData = [],
  showPromoted = false,
  emptyText = "No listings found.",
  numColumns = 2,
  pageSize = 20,
}: InfiniteListingGridProps) {
  const [data, setData] = useState<CatalogItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [error, setError] = useState("");

  const loadPage = useCallback(async (pageNum: number, isRefresh = false) => {
    if (!hasNext && !isRefresh) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError("");
      } else if (pageNum === 1) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }

      const response = await fetchData(pageNum, pageSize);
      const items = catalogFromFeed(response.results);

      if (isRefresh || pageNum === 1) {
        setData(items);
        setPage(2);
      } else {
        setData((prev) => [...prev, ...items]);
        setPage(pageNum + 1);
      }
      
      setHasNext(response.has_next);
    } catch (err) {
      setError("Failed to load listings. Pull to retry.");
      if (pageNum === 1 && data.length === 0) {
        setData([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [fetchData, pageSize, hasNext, data.length]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNext) {
      void loadPage(page);
    }
  }, [loadPage, page, loadingMore, hasNext]);

  const refresh = useCallback(() => {
    setHasNext(true);
    void loadPage(1, true);
  }, [loadPage]);

  useEffect(() => {
    if (initialData.length === 0) {
      void loadPage(1);
    } else {
      setData(initialData);
    }
  }, [loadPage, initialData]);

  const renderItem = useCallback(
    ({ item, index }: { item: CatalogItem; index: number }) => {
      const isLeft = index % numColumns === 0;
      return (
        <View style={{ marginLeft: isLeft ? 0 : GAP }}>
          <ClassifiedGridCard item={item} width={LISTING_CARD_W} showPromoted={showPromoted} />
        </View>
      );
    },
    [numColumns, showPromoted],
  );

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={{ padding: 20, alignItems: "center" }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    return null;
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, margin: 16, ...shadow.card }}>
          <Text style={{ color: colors.red, textAlign: "center", fontWeight: "600" }}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, margin: 16, ...shadow.card }}>
        <Text style={{ color: colors.muted, textAlign: "center" }}>{emptyText}</Text>
      </View>
    );
  }, [loading, error, emptyText]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={8}
      getItemLayout={(data, index) => ({
        length: LISTING_CARD_W * 0.68 + 80, // Approximate item height
        offset: (LISTING_CARD_W * 0.68 + 80) * Math.floor(index / numColumns),
        index,
      })}
    />
  );
}