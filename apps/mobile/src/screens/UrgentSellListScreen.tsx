import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { ListingGrid } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { listingsToCatalog } from "../data/liveListings";
import { fetchListingFeed } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";

const RED = "#DC2626";

export function UrgentSellListScreen() {
  const { feedParams } = useBuyerLocation();
  const [items, setItems] = useState(() => listingsToCatalog([]));

  useEffect(() => {
    const load = () => {
      void fetchListingFeed({ ...feedParams, urgent: "1" })
        .then((rows) => setItems(listingsToCatalog(rows)))
        .catch(() => setItems([]));
    };
    load();
    const poll = setInterval(load, 30000);
    const unsub = subscribeListingsChanged(load);
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [feedParams.place, feedParams.lat, feedParams.lng, feedParams.radius_km]);

  const refreshControl = useAppRefreshControl(async () => {
    const rows = await fetchListingFeed({ ...feedParams, urgent: "1" }).catch(() => []);
    setItems(listingsToCatalog(rows));
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: RED, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="flame" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#111827" }}>Urgent Sell</Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{items.length} limited-time listings</Text>
        </View>
      </View>
      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {items.length ? (
          <ListingGrid items={items} />
        ) : (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" }}>
            <Ionicons name="flame-outline" size={40} color="#D1D5DB" />
            <Text style={{ marginTop: 12, fontWeight: "800", color: "#111827" }}>No urgent listings right now</Text>
            <Text style={{ marginTop: 6, color: "#6B7280", textAlign: "center", fontSize: 13 }}>Check back soon for flash deals from sellers.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
