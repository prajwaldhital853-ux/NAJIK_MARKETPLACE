import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListingListRow } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { listingsToCatalog } from "../data/liveListings";
import { fetchListing, fetchMyReviewsGiven, type MyReviewGiven } from "../listingsApi";
import { getRecentViewIds } from "../listingViews";
import { openListing, openSellerProfile } from "../navigation/browse";
import { colors } from "../theme";

const GREEN = colors.greenDeep;

export function BuyerReviewsGivenScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<MyReviewGiven[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    void fetchMyReviewsGiven()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshControl = useAppRefreshControl(load);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={{ fontWeight: "800", fontSize: 16, flex: 1 }}>Reviews I've given</Text>
        </View>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={GREEN} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={refreshControl}>
          {rows.length === 0 ? (
            <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>You haven't rated any sellers yet.</Text>
          ) : (
            rows.map((row) => (
              <View key={row.id} style={{ backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Pressable onPress={() => openSellerProfile(navigation, row.seller_id)}>
                    <Text style={{ fontWeight: "800", color: GREEN }}>{row.seller_name}</Text>
                  </Pressable>
                  <Text style={{ fontWeight: "800" }}>{row.rating} ★</Text>
                </View>
                {row.listing_title ? (
                  <Pressable onPress={() => row.listing_id && openListing(navigation, row.listing_id)} style={{ marginTop: 6 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{row.listing_title}</Text>
                  </Pressable>
                ) : null}
                {row.text ? <Text style={{ marginTop: 8, lineHeight: 20, color: colors.textSecondary }}>{row.text}</Text> : null}
                <Text style={{ marginTop: 6, fontSize: 11, color: colors.muted }}>{new Date(row.created_at).toLocaleString()}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

export function BuyerRecentViewsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReturnType<typeof listingsToCatalog>>([]);

  const load = useCallback(() => {
    setLoading(true);
    void getRecentViewIds()
      .then(async (ids) => {
        const rows = await Promise.all(ids.slice(0, 10).map((id) => fetchListing(id).catch(() => null)));
        setItems(listingsToCatalog(rows.filter(Boolean) as Awaited<ReturnType<typeof fetchListing>>[]));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshControl = useAppRefreshControl(load);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={{ fontWeight: "800", fontSize: 16, flex: 1 }}>Recently viewed</Text>
        </View>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={GREEN} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={refreshControl}>
          {items.length === 0 ? (
            <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>Open listings to see them here.</Text>
          ) : (
            items.map((item) => <ListingListRow key={item.id} item={item} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}
