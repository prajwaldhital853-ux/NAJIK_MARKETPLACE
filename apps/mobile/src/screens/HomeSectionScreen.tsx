import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InfiniteListingGrid } from "../components/InfiniteListingGrid";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import type { CatalogKey } from "../data/catalog";
import { fetchListingFeedPaginated } from "../listingsApi";
import { colors } from "../theme";

type SectionKey = "recommended" | "trending" | "verified" | "latest";
const PAGE_SIZE = 10;

export function HomeSectionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { feedParams } = useBuyerLocation();
  const section = (route.params?.section as SectionKey) || "trending";
  const catalog = route.params?.catalog as CatalogKey | undefined;
  const title = route.params?.title as string | undefined;

  const heading =
    title ||
    (section === "recommended"
      ? "Recommended"
      : section === "verified"
        ? "By verified sellers"
        : section === "latest"
          ? "Latest uploads"
          : "Trending");

  const fetchData = useCallback(
    async (page: number, pageSize: number) => {
      const base = { ...feedParams, page, page_size: pageSize };
      if (section === "verified") {
        return fetchListingFeedPaginated({ ...base, verified: true, sort: "new" });
      }
      if (section === "trending") {
        return fetchListingFeedPaginated({
          ...base,
          sort: "popular",
          category: catalog,
        });
      }
      return fetchListingFeedPaginated({ ...base, sort: "new" });
    },
    [feedParams, section, catalog],
  );

  const subtitle = useMemo(() => "", []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>{heading}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <InfiniteListingGrid
          key={`${section}-${catalog || "all"}-${feedParams.place || "np"}`}
          fetchData={fetchData}
          emptyText={`No ${heading.toLowerCase()} yet.`}
          pageSize={PAGE_SIZE}
        />
      </View>
    </View>
  );
}
