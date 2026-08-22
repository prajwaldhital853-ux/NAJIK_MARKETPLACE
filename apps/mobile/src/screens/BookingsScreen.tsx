import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, ScrollView, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { BookingFormModal } from "../components/BookingFormModal";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { isProvider } from "../demo";
import { bookingAction, fetchBookings, type ApiBooking } from "../bookingsApi";
import { fetchListingFeed } from "../listingsApi";
import { openChatThread } from "../navigation/browse";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

export function BookingsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const seller = isProvider(user);
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader onClose={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <BookingsBody showSellers={!seller} />
      </ScrollView>
    </View>
  );
}

export function BookingsBody({ showSellers = false }: { showSellers?: boolean }) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { dismissTarget } = useInbox();
  const [rows, setRows] = useState<ApiBooking[]>([]);
  const [tab, setTab] = useState<"mine" | "sellers">(showSellers ? "sellers" : "mine");
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ listingId: string; title: string; location: string } | null>(null);
  const [sellers, setSellers] = useState<{ id: string; name: string; category: string; location: string; item: string; listingId: string; listingTitle: string; photo?: string }[]>([]);

  const load = useCallback(() => {
    void fetchBookings().then(setRows).catch(() => setRows([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      const focusId = String(route.params?.bookingId || "");
      if (focusId) void dismissTarget({ kind: "booking", target_id: focusId }).catch(() => undefined);
      else void dismissTarget({ kind: "booking" }).catch(() => undefined);
      load();
      if (showSellers) {
        void fetchListingFeed()
          .then((feed) => {
            const seen = new Set<string>();
            const next = [];
            for (const row of feed) {
              const key = `${row.owner_id}:${row.id}`;
              if (seen.has(key)) continue;
              seen.add(key);
              next.push({
                id: row.owner_id,
                name: row.owner_name || "Seller",
                category: row.category,
                location: row.location,
                item: row.subcategory,
                listingId: row.id,
                listingTitle: row.title,
                photo: row.photos[0]?.url,
              });
            }
            setSellers(next);
          })
          .catch(() => setSellers([]));
      }
    }, [load, showSellers, dismissTarget]),
  );

  const focusId = String(route.params?.bookingId || "");

  const list = rows.filter((row) => {
    if (filter !== "All" && row.status !== filter.toLowerCase()) return false;
    const hay = `${row.listing_title} ${row.other_name} ${row.item} ${row.location}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });

  const sellerList = useMemo(() => {
    const hay = q.trim().toLowerCase();
    return sellers.filter((row) => {
      if (!hay) return true;
      return `${row.name} ${row.category} ${row.location} ${row.item} ${row.listingTitle}`.toLowerCase().includes(hay);
    });
  }, [sellers, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sellerList>();
    for (const row of sellerList) {
      const key = row.category || "other";
      map.set(key, [...(map.get(key) || []), row]);
    }
    return [...map.entries()];
  }, [sellerList]);

  async function act(id: string, action: "accept" | "reject" | "cancel") {
    try {
      const row = await bookingAction(id, action);
      setRows((prev) => prev.map((item) => (item.id === row.id ? row : item)));
    } catch (err) {
      Alert.alert("Could not update", err instanceof Error ? err.message : "Try again.");
    }
  }

  return (
    <>
      {showSellers ? (
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 8, backgroundColor: "#EEF2F4", borderRadius: 12, padding: 3 }}>
          {(["sellers", "mine"] as const).map((key) => (
            <PressScale
              key={key}
              onPress={() => setTab(key)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: tab === key ? GREEN : "transparent", alignItems: "center" }}
            >
              <Text style={{ fontWeight: "800", fontSize: 12, color: tab === key ? "#fff" : "#4B5563" }}>
                {key === "sellers" ? "Sellers" : "My bookings"}
              </Text>
            </PressScale>
          ))}
        </View>
      ) : null}

      <View
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: 16,
          paddingLeft: 12,
          height: 44,
          borderWidth: 1,
          borderColor: "#E6E8EC",
        }}
      >
        <Ionicons name="search" size={16} color="#9AA0A6" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={tab === "sellers" ? "Filter by location, item, seller…" : "Find a booking…"}
          placeholderTextColor="#9AA0A6"
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>

      {tab === "mine" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, marginTop: 12 }}>
          {["All", "Pending", "Accepted", "Rejected", "Cancelled"].map((item) => {
            const on = filter === item;
            return (
              <PressScale key={item} onPress={() => setFilter(item)} style={{ backgroundColor: on ? GREEN : "#fff", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, ...shadow.card }}>
                <Text style={{ color: on ? "#fff" : "#374151", fontWeight: "700", fontSize: 12 }}>{item}</Text>
              </PressScale>
            );
          })}
        </ScrollView>
      ) : null}

      {tab === "sellers" ? (
        grouped.length ? (
          grouped.map(([cat, items]) => (
            <View key={cat} style={{ marginTop: 16 }}>
              <Text style={{ marginHorizontal: 16, fontWeight: "800", fontSize: 16, textTransform: "capitalize" }}>{cat}</Text>
              {items.map((row) => (
                <PressScale
                  key={row.listingId}
                  onPress={() => setForm({ listingId: row.listingId, title: row.listingTitle, location: row.location })}
                  style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 16, padding: 12, flexDirection: "row", gap: 10, ...shadow.card }}
                >
                  {row.photo ? <Image source={{ uri: row.photo }} style={{ width: 64, height: 64, borderRadius: 12 }} /> : (
                    <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={22} color={GREEN} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800" }}>{row.name}</Text>
                    <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 2 }} numberOfLines={1}>{row.listingTitle}</Text>
                    <Text style={{ color: "#8A8F98", fontSize: 11, marginTop: 4 }}>{row.location} · {row.item}</Text>
                  </View>
                  <Ionicons name="calendar-outline" size={18} color={GREEN} />
                </PressScale>
              ))}
            </View>
          ))
        ) : (
          <Text style={{ textAlign: "center", color: "#8A8F98", marginTop: 24 }}>No sellers match this filter.</Text>
        )
      ) : (
        list.map((row) => (
          <View
            key={row.id}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 12,
              borderWidth: focusId && focusId === row.id ? 2 : 0,
              borderColor: GREEN,
              ...shadow.card,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontWeight: "800", flex: 1 }}>{row.listing_title}</Text>
              <StatusPill status={row.status} />
            </View>
            <Text style={{ color: "#4B5563", marginTop: 4, fontSize: 12 }}>{row.other_name} · {row.item}</Text>
            <Text style={{ color: "#8A8F98", marginTop: 4, fontSize: 11 }}>
              {new Date(row.scheduled_at).toLocaleString()} · {row.location}
            </Text>
            {row.contact_name ? <Text style={{ color: "#374151", marginTop: 6, fontSize: 12 }}>Name: {row.contact_name}</Text> : null}
            {row.contact_phone ? <Text style={{ color: "#374151", marginTop: 2, fontSize: 12 }}>Phone: {row.contact_phone}</Text> : null}
            {row.note ? <Text style={{ color: "#374151", marginTop: 6, fontSize: 12 }}>{row.note}</Text> : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {row.status === "pending" && !row.i_requested ? (
                <>
                  <Mini label="Accept" fill onPress={() => void act(row.id, "accept")} />
                  <Mini label="Reject" danger onPress={() => void act(row.id, "reject")} />
                </>
              ) : null}
              {(row.status === "pending" || row.status === "accepted") && row.i_requested ? (
                <Mini label="Cancel" danger onPress={() => void act(row.id, "cancel")} />
              ) : null}
              {row.status === "accepted" && !row.i_requested ? (
                <Mini label="Cancel" danger onPress={() => void act(row.id, "cancel")} />
              ) : null}
              {row.thread ? <Mini label="Open chat" onPress={() => openChatThread(navigation, row.thread as string)} /> : null}
            </View>
          </View>
        ))
      )}

      {form ? (
        <BookingFormModal
          visible
          listingId={form.listingId}
          listingTitle={form.title}
          listingLocation={form.location}
          onClose={() => setForm(null)}
          onSent={load}
        />
      ) : null}
    </>
  );
}

function StatusPill({ status }: { status: ApiBooking["status"] }) {
  const map = {
    pending: { bg: "#FFF7ED", color: "#C2410C", label: "Pending" },
    accepted: { bg: "#E7F6EC", color: "#146B32", label: "Accepted" },
    rejected: { bg: "#FEE2E2", color: "#B91C1C", label: "Rejected" },
    cancelled: { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
  }[status];
  return (
    <View style={{ backgroundColor: map.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
      <Text style={{ color: map.color, fontSize: 10, fontWeight: "800" }}>{map.label}</Text>
    </View>
  );
}

function Mini({ label, onPress, fill, danger }: { label: string; onPress: () => void; fill?: boolean; danger?: boolean }) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 12,
        backgroundColor: fill ? GREEN : "#fff",
        borderWidth: 1,
        borderColor: danger ? "#FECACA" : fill ? GREEN : "#D1D5DB",
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 11, color: fill ? "#fff" : danger ? "#B91C1C" : "#111827" }}>{label}</Text>
    </PressScale>
  );
}
