import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { listingsToCatalog } from "../data/liveListings";
import { fetchListingFeed } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openCategory } from "../navigation/browse";
import { UrgentListingCard } from "./ClassifiedCard";
import { PressScale } from "./PressScale";

const RED = "#DC2626";

function useCountdown(endsAt?: string) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setMs(Math.max(0, Date.parse(endsAt) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return ms;
}

export function formatUrgentCountdown(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function UrgentSellSection() {
  const navigation = useNavigation<any>();
  const { feedParams } = useBuyerLocation();
  const [items, setItems] = useState(() => [] as ReturnType<typeof listingsToCatalog>);

  useEffect(() => {
    const load = () => {
      void fetchListingFeed({ ...feedParams, urgent: "1" })
        .then((rows) => setItems(listingsToCatalog(rows)))
        .catch(() => setItems([]));
    };
    load();
    const poll = setInterval(load, 45000);
    const unsub = subscribeListingsChanged(load);
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [feedParams.place, feedParams.lat, feedParams.lng, feedParams.radius_km]);

  if (!items.length) return null;

  return (
    <View style={{ marginTop: 14, marginBottom: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: RED, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="flame" size={16} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#111827" }}>Urgent Sell</Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Limited time deals</Text>
        </View>
        <PressScale onPress={() => openCategory(navigation, "vehicles")}>
          <Text style={{ color: RED, fontWeight: "800", fontSize: 13 }}>View All ›</Text>
        </PressScale>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {items.map((item) => (
          <UrgentListingCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

export function CountdownLabel({ endsAt }: { endsAt?: string }) {
  const ms = useCountdown(endsAt);
  if (!endsAt || ms <= 0) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
      <Ionicons name="time-outline" size={12} color="#6B7280" />
      <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700" }}>{formatUrgentCountdown(ms)}</Text>
    </View>
  );
}
