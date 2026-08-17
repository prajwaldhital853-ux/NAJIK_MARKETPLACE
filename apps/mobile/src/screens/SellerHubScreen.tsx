import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Share, Switch, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import {
  helpFaqs,
  kycSteps,
  payouts,
  promoPacks,
  sellerBookings,
  sellerNotes,
  sellerPageMeta,
  sellerReviews,
  sellerSaved,
  sellerServices,
  sellerThreads,
  weekBars,
  type SellerPage,
} from "../data/sellerHub";
import { openListing } from "../navigation/browse";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const PAGES: SellerPage[] = [
  "bookings",
  "reviews",
  "earnings",
  "promotions",
  "services",
  "saved",
  "kyc",
  "notifications",
  "messages",
  "settings",
  "help",
  "invite",
];

export function SellerHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const page: SellerPage = PAGES.includes(route.params?.page) ? route.params.page : "bookings";
  const meta = sellerPageMeta[page];

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader onClose={() => navigation.goBack()} right="bell-chat" showPro bellCount={5} />
      <KeyboardScreen contentStyle={{ paddingBottom: 28 }}>
        <PageHead meta={meta} />
        <PageBody page={page} />
      </KeyboardScreen>
    </View>
  );
}

function PageHead({ meta }: { meta: (typeof sellerPageMeta)[SellerPage] }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", fontSize: 20, color: "#111827" }}>{meta.title}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{meta.sub}</Text>
      </View>
    </View>
  );
}

function QuickRow({
  items,
}: {
  items: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[];
}) {
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 }}>
      {items.map((item) => (
        <PressScale
          key={item.label}
          onPress={item.onPress}
          style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", ...shadow.card }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={item.icon} size={16} color={GREEN} />
          </View>
          <Text style={{ fontWeight: "700", fontSize: 10, marginTop: 6, color: "#111827", textAlign: "center" }}>{item.label}</Text>
        </PressScale>
      ))}
    </View>
  );
}

function PageBody({ page }: { page: SellerPage }) {
  if (page === "bookings") return <BookingsBody />;
  if (page === "reviews") return <ReviewsBody />;
  if (page === "earnings") return <EarningsBody />;
  if (page === "promotions") return <PromosBody />;
  if (page === "services") return <ServicesBody />;
  if (page === "saved") return <SavedBody />;
  if (page === "kyc") return <KycBody />;
  if (page === "notifications") return <NotesBody />;
  if (page === "messages") return <MessagesBody />;
  if (page === "settings") return <SettingsBody />;
  if (page === "help") return <HelpBody />;
  return <InviteBody />;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        paddingLeft: 12,
        height: 48,
        borderWidth: 1,
        borderColor: "#E6E8EC",
      }}
    >
      <Ionicons name="search" size={18} color="#9AA0A6" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA0A6"
        onFocus={onInputFocus}
        style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy }}
      />
    </View>
  );
}

function Chips({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
      {items.map((item) => {
        const on = item === value;
        return (
          <PressScale
            key={item}
            onPress={() => onChange(item)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 18,
              backgroundColor: on ? GREEN : "#fff",
              borderWidth: 1,
              borderColor: on ? GREEN : "#E6E8EC",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 12, color: on ? "#fff" : "#374151" }}>{item}</Text>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

function BookingsBody() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [rows, setRows] = useState(sellerBookings);
  const list = rows.filter((row) => {
    if (filter !== "All" && row.status !== filter) return false;
    const hay = `${row.name} ${row.job} ${row.where}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });

  function setStatus(id: string, status: (typeof sellerBookings)[0]["status"]) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  return (
    <>
      <QuickRow
        items={[
          { icon: "today-outline", label: "Today", onPress: () => setFilter("Upcoming") },
          { icon: "checkmark-circle-outline", label: "Confirm", onPress: () => setFilter("Confirmed") },
          { icon: "navigate-outline", label: "Route", onPress: () => Alert.alert("Route", "Demo map of today’s visits in Lahan.") },
          { icon: "add-circle-outline", label: "New visit", onPress: () => Alert.alert("New visit", "Pick a listing and time in chat.") },
        ]}
      />
      <StatStrip
        items={[
          { n: String(rows.filter((r) => r.status === "Upcoming").length), l: "Upcoming" },
          { n: String(rows.filter((r) => r.status === "Confirmed").length), l: "Confirmed" },
          { n: String(rows.filter((r) => r.status === "Completed").length), l: "Done" },
        ]}
      />
      <Chips items={["All", "Upcoming", "Confirmed", "Completed", "Cancelled"]} value={filter} onChange={setFilter} />
      <SearchBox value={q} onChange={setQ} placeholder="Find a client..." />
      {list.map((row) => (
        <View key={row.id} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 12, ...shadow.card }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Image source={row.photo} style={{ width: 72, height: 72, borderRadius: 12 }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "800", fontSize: 14, color: "#111827", flex: 1 }}>{row.name}</Text>
                <StatusPill status={row.status} />
              </View>
              <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 3 }}>{row.job}</Text>
              <Text style={{ color: "#8A8F98", fontSize: 11, marginTop: 4 }}>
                {row.when} · {row.where}
              </Text>
              <Text style={{ color: GREEN, fontWeight: "800", marginTop: 6 }}>{row.pay}</Text>
            </View>
          </View>
          {row.status === "Upcoming" ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <MiniBtn label="Confirm" fill onPress={() => setStatus(row.id, "Confirmed")} />
              <MiniBtn label="Reschedule" onPress={() => Alert.alert("Reschedule", "Demo: pick a new slot in chat.")} />
              <MiniBtn label="Cancel" danger onPress={() => setStatus(row.id, "Cancelled")} />
            </View>
          ) : row.status === "Confirmed" ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <MiniBtn label="Mark done" fill onPress={() => setStatus(row.id, "Completed")} />
              <MiniBtn label="Navigate" onPress={() => Alert.alert("Directions", row.where)} />
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
}

function ReviewsBody() {
  const [filter, setFilter] = useState("All");
  const [replied, setReplied] = useState<Record<string, string>>({});
  const list = sellerReviews.filter((row) => filter === "All" || (filter === "5★" ? row.rating === 5 : row.rating === 4));

  return (
    <>
      <QuickRow
        items={[
          { icon: "star-outline", label: "Ask review", onPress: () => Alert.alert("Request", "Demo: send a review link after a visit.") },
          { icon: "chatbubble-outline", label: "Reply all", onPress: () => Alert.alert("Replies", "Open unread reviews below.") },
          { icon: "share-social-outline", label: "Share", onPress: () => void Share.share({ message: "See my 4.9 rating on NAJIK" }) },
          { icon: "flag-outline", label: "Report", onPress: () => Alert.alert("Report", "Flag a fake review in demo.") },
        ]}
      />
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 36, fontWeight: "800", color: "#111827" }}>4.9</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            {[5, 4, 3, 2, 1].map((n) => (
              <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <Text style={{ width: 10, fontSize: 10, color: "#6B7280" }}>{n}</Text>
                <View style={{ flex: 1, height: 6, backgroundColor: "#EEF0F2", borderRadius: 4, overflow: "hidden" }}>
                  <View style={{ width: `${n === 5 ? 78 : n === 4 ? 14 : 4}%`, height: "100%", backgroundColor: "#F5C518" }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Chips items={["All", "5★", "4★"]} value={filter} onChange={setFilter} />
      {list.map((row) => (
        <View key={row.id} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontWeight: "800", color: GREEN }}>{row.name[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: "800", fontSize: 14 }}>{row.name}</Text>
              <Text style={{ color: "#9AA0A6", fontSize: 11 }}>{row.listing} · {row.time}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons key={n} name="star" size={12} color={n <= row.rating ? "#F5C518" : "#E6E8EC"} />
              ))}
            </View>
          </View>
          <Text style={{ color: "#4B5563", fontSize: 13, lineHeight: 20, marginTop: 10 }}>{row.text}</Text>
          {replied[row.id] ? (
            <View style={{ marginTop: 10, backgroundColor: "#F3FBF5", borderRadius: 12, padding: 10 }}>
              <Text style={{ color: GREEN, fontWeight: "800", fontSize: 11 }}>Your reply</Text>
              <Text style={{ color: "#374151", fontSize: 12, marginTop: 4 }}>{replied[row.id]}</Text>
            </View>
          ) : (
            <MiniBtn
              label="Reply"
              onPress={() => setReplied((p) => ({ ...p, [row.id]: "Thank you for visiting on NAJIK. You’re welcome anytime." }))}
            />
          )}
        </View>
      ))}
    </>
  );
}

function EarningsBody() {
  return (
    <>
      <QuickRow
        items={[
          { icon: "download-outline", label: "Withdraw", onPress: () => Alert.alert("Withdraw", "Demo payout to eSewa · 9812••••78") },
          { icon: "document-text-outline", label: "Invoice", onPress: () => Alert.alert("Statement", "August PDF is ready in demo.") },
          { icon: "card-outline", label: "eSewa", onPress: () => Alert.alert("Payout method", "9812••••78") },
          { icon: "pie-chart-outline", label: "Report", onPress: () => Alert.alert("Report", "Views vs visits this month.") },
        ]}
      />
      <StatStrip
        items={[
          { n: "24.8k", l: "Balance" },
          { n: "3.2k", l: "Pending" },
          { n: "+18%", l: "Vs last wk" },
        ]}
      />
      <Text style={{ fontWeight: "800", fontSize: 16, paddingHorizontal: 16 }}>This week</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, marginHorizontal: 16, marginTop: 12, gap: 8 }}>
        {weekBars.map((bar) => (
          <View key={bar.d} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: "#8A8F98", marginBottom: 4 }}>{bar.n}</Text>
            <View style={{ width: "100%", height: 88, justifyContent: "flex-end" }}>
              <View style={{ height: 88 * bar.v, backgroundColor: GREEN, borderRadius: 8, opacity: 0.85 }} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 6 }}>{bar.d}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontWeight: "800", fontSize: 16, paddingHorizontal: 16, marginTop: 22 }}>Recent activity</Text>
      {payouts.map((row) => (
        <View key={row.id} style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", ...shadow.card }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: row.ok ? "#E7F6EC" : "#FDECEC", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={row.ok ? "arrow-down" : "arrow-up"} size={16} color={row.ok ? GREEN : colors.red} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: "800", fontSize: 13 }}>{row.title}</Text>
            <Text style={{ color: "#8A8F98", fontSize: 11, marginTop: 2 }}>{row.when}</Text>
          </View>
          <Text style={{ fontWeight: "800", color: row.ok ? GREEN : "#111827" }}>{row.amount}</Text>
        </View>
      ))}
    </>
  );
}

function PromosBody() {
  const [on, setOn] = useState("g1");
  return (
    <>
      <QuickRow
        items={[
          { icon: "flash-outline", label: "Boost now", onPress: () => setOn("g1") },
          { icon: "eye-outline", label: "Reach", onPress: () => Alert.alert("Reach", "Last boost: 3.2k extra views.") },
          { icon: "pause-outline", label: "Pause", onPress: () => Alert.alert("Paused", "Demo campaign paused.") },
          { icon: "create-outline", label: "New ad", onPress: () => Alert.alert("New ad", "Pick a listing to promote.") },
        ]}
      />
      <Text style={{ fontWeight: "800", fontSize: 16, paddingHorizontal: 16, marginTop: 16 }}>Reach this week</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, marginHorizontal: 16, marginTop: 10, gap: 8 }}>
        {weekBars.map((bar) => (
          <View key={bar.d} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ width: "100%", height: 72, justifyContent: "flex-end" }}>
              <View style={{ height: 72 * bar.v, backgroundColor: "#EA580C", borderRadius: 8 }} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 6 }}>{bar.d}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontWeight: "800", fontSize: 16, paddingHorizontal: 16, marginTop: 18 }}>Boost packs</Text>
      {promoPacks.map((pack) => {
        const active = on === pack.id;
        return (
          <PressScale
            key={pack.id}
            onPress={() => setOn(pack.id)}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: 16,
              borderWidth: 2,
              borderColor: active ? GREEN : "transparent",
              ...shadow.card,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "800", fontSize: 16 }}>{pack.name}</Text>
              {pack.popular ? (
                <View style={{ backgroundColor: "#FFF1E0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ color: "#C2410C", fontWeight: "800", fontSize: 10 }}>Popular</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: GREEN, fontWeight: "800", fontSize: 22, marginTop: 8 }}>{pack.price}</Text>
            <Text style={{ color: "#6B7280", marginTop: 4 }}>
              {pack.days} · {pack.reach}
            </Text>
            <MiniBtn label={active ? "Selected" : "Use this pack"} fill={active} onPress={() => setOn(pack.id)} />
          </PressScale>
        );
      })}
    </>
  );
}

function ServicesBody() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(sellerServices);
  const list = rows.filter((row) => `${row.title} ${row.sub}`.toLowerCase().includes(q.trim().toLowerCase()) || !q.trim());

  return (
    <>
      <QuickRow
        items={[
          { icon: "add-outline", label: "Add", onPress: () => Alert.alert("Add service", "Demo: plumbing, visits, inspection.") },
          { icon: "pricetag-outline", label: "Prices", onPress: () => Alert.alert("Prices", "Edit visit fees in the list.") },
          { icon: "time-outline", label: "Hours", onPress: () => Alert.alert("Hours", "8am – 7pm · Lahan") },
          { icon: "map-outline", label: "Area", onPress: () => Alert.alert("Coverage", "Lahan, Golbazar, Siraha.") },
        ]}
      />
      <StatStrip
        items={[
          { n: String(rows.filter((r) => r.on).length), l: "Live" },
          { n: String(rows.filter((r) => !r.on).length), l: "Paused" },
          { n: "4.8", l: "Rating" },
        ]}
      />
      <SearchBox value={q} onChange={setQ} placeholder="Find a service..." />
      {list.map((row) => (
        <View key={row.id} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 12, flexDirection: "row", ...shadow.card }}>
          <Image source={row.photo} style={{ width: 72, height: 72, borderRadius: 12 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: "800", fontSize: 14 }}>{row.title}</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{row.sub}</Text>
            <Text style={{ color: GREEN, fontWeight: "800", marginTop: 6 }}>{row.price}</Text>
          </View>
          <Switch
            value={row.on}
            onValueChange={() => setRows((prev) => prev.map((s) => (s.id === row.id ? { ...s, on: !s.on } : s)))}
            trackColor={{ false: "#E6E8EC", true: "#A8E0B8" }}
            thumbColor={row.on ? GREEN : "#f4f3f4"}
          />
        </View>
      ))}
    </>
  );
}

function SavedBody() {
  const navigation = useNavigation<any>();
  const map: Record<string, string> = { ss1: "sh2", ss2: "v1", ss3: "p3" };
  const [ids, setIds] = useState(sellerSaved.map((r) => r.id));
  const [filter, setFilter] = useState("All");
  const rows = sellerSaved.filter((row) => {
    if (!ids.includes(row.id)) return false;
    if (filter === "Shops") return row.title.toLowerCase().includes("shop");
    if (filter === "Vehicles") return row.title.toLowerCase().includes("creta") || row.title.toLowerCase().includes("car");
    if (filter === "Land") return row.title.toLowerCase().includes("land");
    return true;
  });

  return (
    <>
      <QuickRow
        items={[
          { icon: "eye-outline", label: "Open", onPress: () => rows[0] && openListing(navigation, map[rows[0].id] ?? "p1") },
          { icon: "swap-horizontal-outline", label: "Compare", onPress: () => Alert.alert("Compare", "Demo: stack two market ads side by side.") },
          { icon: "share-social-outline", label: "Share", onPress: () => void Share.share({ message: "Saved on NAJIK" }) },
          { icon: "trash-outline", label: "Clear", onPress: () => setIds([]) },
        ]}
      />
      <StatStrip
        items={[
          { n: String(rows.length), l: "Watching" },
          { n: "3", l: "Price drops" },
          { n: "Lahan", l: "Area" },
        ]}
      />
      <Chips items={["All", "Shops", "Vehicles", "Land"]} value={filter} onChange={setFilter} />
      {rows.length === 0 ? (
        <View style={{ margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", ...shadow.card }}>
          <Ionicons name="bookmark-outline" size={28} color={GREEN} />
          <Text style={{ fontWeight: "800", marginTop: 8 }}>Watchlist empty</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, textAlign: "center" }}>Save nearby ads to track prices.</Text>
        </View>
      ) : (
        rows.map((row) => (
          <PressScale
            key={row.id}
            onPress={() => openListing(navigation, map[row.id] ?? "p1")}
            style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 10, flexDirection: "row", ...shadow.card }}
          >
            <Image source={row.photo} style={{ width: 84, height: 84, borderRadius: 12 }} />
            <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
              <Text style={{ fontWeight: "800", fontSize: 14 }}>{row.title}</Text>
              <Text style={{ color: GREEN, fontWeight: "800", marginTop: 4 }}>{row.price}</Text>
              <Text style={{ color: "#8A8F98", fontSize: 12, marginTop: 4 }}>{row.where}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Text style={{ color: GREEN, fontSize: 11, fontWeight: "800" }}>View listing</Text>
                <Text style={{ color: "#9AA0A6", fontSize: 11 }}>· Market watch</Text>
              </View>
            </View>
            <Pressable onPress={() => setIds((p) => p.filter((id) => id !== row.id))} hitSlop={8}>
              <Ionicons name="heart" size={18} color={colors.red} />
            </Pressable>
          </PressScale>
        ))
      )}
    </>
  );
}

function KycBody() {
  const { user, refreshVerification } = useAuth();
  const done = kycSteps.filter((s) => s.done).length;

  return (
    <>
      <QuickRow
        items={[
          { icon: "refresh-outline", label: "Refresh", onPress: () => void refreshVerification() },
          { icon: "card-outline", label: "eSewa", onPress: () => Alert.alert("eSewa", "Demo: add 9812••••78") },
          { icon: "document-outline", label: "ID copy", onPress: () => Alert.alert("Nagrita", "Already on file with NAJIK admin.") },
          { icon: "help-circle-outline", label: "Why KYC", onPress: () => Alert.alert("KYC", "Verified sellers get more calls and can withdraw.") },
        ]}
      />
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", ...shadow.card }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: GREEN, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>{done}/{kycSteps.length}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontWeight: "800", fontSize: 15 }}>You’re verified to post</Text>
          <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            {user?.full_name || "Sunil"} · {user?.service_type || "Local services"} · Lahan
          </Text>
          <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12, marginTop: 6 }}>Add eSewa to unlock payouts</Text>
        </View>
      </View>
      <StatStrip items={[{ n: "Live", l: "Listings" }, { n: "OK", l: "ID check" }, { n: "Pending", l: "Payouts" }]} />
      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 16 }}>Checklist</Text>
      {kycSteps.map((step, i) => (
        <View key={step.id} style={{ marginHorizontal: 16, flexDirection: "row", gap: 12, marginTop: i === 0 ? 8 : 0 }}>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: step.done ? GREEN : "#E6E8EC", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={step.done ? "checkmark" : "ellipse-outline"} size={14} color={step.done ? "#fff" : "#9AA0A6"} />
            </View>
            {i < kycSteps.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: "#E6E8EC", minHeight: 28 }} /> : null}
          </View>
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 10, ...shadow.card }}>
            <Text style={{ fontWeight: "800" }}>{step.title}</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }}>{step.sub}</Text>
            {!step.done ? (
              <MiniBtn label="Add now" fill onPress={() => Alert.alert("Bank / eSewa", "Demo: add 9812••••78 for payouts.")} />
            ) : null}
          </View>
        </View>
      ))}
    </>
  );
}

function NotesBody() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [read, setRead] = useState<string[]>([]);
  const unreadCount = sellerNotes.filter((row) => row.unread && !read.includes(row.id)).length;
  const list = sellerNotes.filter((row) => {
    const unread = row.unread && !read.includes(row.id);
    if (filter === "Unread" && !unread) return false;
    return `${row.title} ${row.sub}`.toLowerCase().includes(q.trim().toLowerCase()) || !q.trim();
  });

  return (
    <>
      <QuickRow
        items={[
          { icon: "checkmark-done-outline", label: "Read all", onPress: () => setRead(sellerNotes.map((n) => n.id)) },
          { icon: "notifications-off-outline", label: "Mute", onPress: () => Alert.alert("Muted", "Demo: quiet hours 10pm–7am.") },
          { icon: "settings-outline", label: "Alerts", onPress: () => Alert.alert("Alerts", "Leads, visits, reviews.") },
          { icon: "trash-outline", label: "Clear", onPress: () => setRead(sellerNotes.map((n) => n.id)) },
        ]}
      />
      <StatStrip
        items={[
          { n: String(unreadCount), l: "Unread" },
          { n: String(sellerNotes.length), l: "Today" },
          { n: "On", l: "Push" },
        ]}
      />
      <SearchBox value={q} onChange={setQ} placeholder="Search alerts..." />
      <Chips items={["All", "Unread"]} value={filter} onChange={setFilter} />
      {list.map((row) => {
        const unread = row.unread && !read.includes(row.id);
        return (
          <PressScale
            key={row.id}
            onPress={() => setRead((p) => (p.includes(row.id) ? p : [...p, row.id]))}
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              backgroundColor: unread ? "#F3FBF5" : "#fff",
              borderRadius: 16,
              padding: 14,
              flexDirection: "row",
              ...shadow.card,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={18} color={GREEN} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "800", fontSize: 13 }}>{row.title}</Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }}>{row.sub}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "#9AA0A6", fontSize: 10 }}>{row.time}</Text>
              {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginTop: 8 }} /> : null}
            </View>
          </PressScale>
        );
      })}
    </>
  );
}

function MessagesBody() {
  const [open, setOpen] = useState<string | null>(sellerThreads[0].id);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<Record<string, string[]>>({});
  const [q, setQ] = useState("");
  const { onInputFocus } = useKeyboardScroll();
  const thread = sellerThreads.find((t) => t.id === open);
  const threads = sellerThreads.filter((row) => `${row.name} ${row.last}`.toLowerCase().includes(q.trim().toLowerCase()) || !q.trim());
  const unread = sellerThreads.reduce((n, t) => n + t.unread, 0);

  return (
    <>
      <QuickRow
        items={[
          { icon: "create-outline", label: "New chat", onPress: () => Alert.alert("New chat", "Pick a buyer from inquiries.") },
          { icon: "call-outline", label: "Call", onPress: () => thread && Linking.openURL("tel:+9779812345678") },
          { icon: "image-outline", label: "Photo", onPress: () => Alert.alert("Photo", "Demo: send a listing photo.") },
          { icon: "ellipsis-horizontal", label: "More", onPress: () => Alert.alert("Chat", "Mute · Block · Report") },
        ]}
      />
      <StatStrip
        items={[
          { n: String(sellerThreads.length), l: "Chats" },
          { n: String(unread), l: "Unread" },
          { n: "< 1h", l: "Reply" },
        ]}
      />
      <SearchBox value={q} onChange={setQ} placeholder="Search chats..." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
        {threads.map((row) => {
          const on = row.id === open;
          return (
            <PressScale
              key={row.id}
              onPress={() => setOpen(row.id)}
              style={{
                width: 220,
                backgroundColor: on ? "#E7F6EC" : "#fff",
                borderRadius: 16,
                padding: 12,
                borderWidth: 1.5,
                borderColor: on ? GREEN : "#E6E8EC",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Image source={{ uri: row.photo }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 13 }} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={{ color: "#8A8F98", fontSize: 11 }}>{row.time}</Text>
                </View>
                {row.unread ? (
                  <View style={{ backgroundColor: "#E53935", minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{row.unread}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 8 }} numberOfLines={2}>
                {row.last}
              </Text>
            </PressScale>
          );
        })}
      </ScrollView>

      {thread ? (
        <View style={{ margin: 16, backgroundColor: "#fff", borderRadius: 18, padding: 14, ...shadow.card }}>
          <Text style={{ fontWeight: "800", fontSize: 15 }}>{thread.name}</Text>
          <View style={{ backgroundColor: "#F3F4F6", borderRadius: 12, padding: 10, marginTop: 12, alignSelf: "flex-start", maxWidth: "88%" }}>
            <Text style={{ color: "#374151", fontSize: 13, lineHeight: 19 }}>{thread.last}</Text>
          </View>
          {(sent[thread.id] ?? []).map((msg, i) => (
            <View key={i} style={{ backgroundColor: GREEN, borderRadius: 12, padding: 10, marginTop: 8, alignSelf: "flex-end", maxWidth: "88%" }}>
              <Text style={{ color: "#fff", fontSize: 13 }}>{msg}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onFocus={onInputFocus}
              placeholder="Reply…"
              placeholderTextColor="#9AA0A6"
              style={{ flex: 1, backgroundColor: "#F7F8FA", borderRadius: 12, paddingHorizontal: 12, height: 44, fontSize: 13 }}
            />
            <PressScale
              onPress={() => {
                if (!draft.trim()) return;
                setSent((p) => ({ ...p, [thread.id]: [...(p[thread.id] ?? []), draft.trim()] }));
                setDraft("");
              }}
              style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </PressScale>
          </View>
        </View>
      ) : null}
    </>
  );
}

function SettingsBody() {
  const { user } = useAuth();
  const [call, setCall] = useState(true);
  const [lead, setLead] = useState(true);
  const [hide, setHide] = useState(false);

  return (
    <>
      <QuickRow
        items={[
          { icon: "person-outline", label: "Profile", onPress: () => Alert.alert("Profile", user?.full_name || "Sunil") },
          { icon: "lock-closed-outline", label: "Security", onPress: () => Alert.alert("Security", "PIN / biometrics in a later build.") },
          { icon: "card-outline", label: "Payouts", onPress: () => Alert.alert("Payouts", "eSewa · 9812••••78") },
          { icon: "trash-outline", label: "Delete", onPress: () => Alert.alert("Delete account", "Demo only.") },
        ]}
      />
      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 16 }}>Account</Text>
      <View style={{ margin: 16, marginTop: 8, backgroundColor: "#fff", borderRadius: 18, padding: 6, ...shadow.card }}>
        <SettingRow icon="person-outline" title="Name" value={user?.full_name || "Sunil K. Sah"} />
        <SettingRow icon="call-outline" title="Phone" value={user?.phone || "9812••••78"} />
        <SettingRow icon="mail-outline" title="Email" value={user?.email || "sunil@email.com"} last />
      </View>
      <Text style={{ fontWeight: "800", marginHorizontal: 16 }}>Alerts & privacy</Text>
      <View style={{ margin: 16, marginTop: 8, backgroundColor: "#fff", borderRadius: 18, padding: 6, ...shadow.card }}>
        <ToggleRow icon="notifications-outline" title="Lead alerts" value={lead} onChange={setLead} />
        <ToggleRow icon="call" title="Allow buyer calls" value={call} onChange={setCall} />
        <ToggleRow icon="eye-off-outline" title="Hide number on ads" value={hide} onChange={setHide} />
        <SettingRow icon="language-outline" title="Language" value="English" />
        <SettingRow icon="moon-outline" title="Appearance" value="Light" last />
      </View>
    </>
  );
}

function HelpBody() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(0);
  const list = helpFaqs.filter((row) => row.q.toLowerCase().includes(q.trim().toLowerCase()) || !q.trim());

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 }}>
        {[
          { icon: "book-outline" as const, t: "Guides" },
          { icon: "videocam-outline" as const, t: "Videos" },
          { icon: "warning-outline" as const, t: "Safety" },
          { icon: "cash-outline" as const, t: "Fees" },
        ].map((item) => (
          <PressScale key={item.t} onPress={() => Alert.alert(item.t, "Demo help article.")} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", ...shadow.card }}>
            <Ionicons name={item.icon} size={18} color={GREEN} />
            <Text style={{ fontWeight: "700", fontSize: 10, marginTop: 6 }}>{item.t}</Text>
          </PressScale>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 }}>
        <PressScale
          onPress={() => Linking.openURL("tel:+9779812345678")}
          style={{ flex: 1, backgroundColor: GREEN, borderRadius: 14, padding: 14, alignItems: "center" }}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", marginTop: 6 }}>Call NAJIK</Text>
        </PressScale>
        <PressScale
          onPress={() => Alert.alert("Chat support", "Demo help desk is online 8am–8pm.")}
          style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", ...shadow.card }}
        >
          <Ionicons name="chatbubbles" size={18} color={GREEN} />
          <Text style={{ color: GREEN, fontWeight: "800", marginTop: 6 }}>Live chat</Text>
        </PressScale>
      </View>
      <SearchBox value={q} onChange={setQ} placeholder="Search FAQs..." />
      {list.map((faq, i) => (
        <Pressable
          key={faq.q}
          onPress={() => setOpen(open === i ? -1 : i)}
          style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 14, padding: 14, ...shadow.card }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 13, paddingRight: 8 }}>{faq.q}</Text>
            <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={16} color="#9AA0A6" />
          </View>
          {open === i ? <Text style={{ color: "#4B5563", fontSize: 13, lineHeight: 20, marginTop: 8 }}>{faq.a}</Text> : null}
        </Pressable>
      ))}
    </>
  );
}

function InviteBody() {
  const code = "NAJIK-SUNIL";
  const friends = [
    { n: "Ramesh", s: "Joined · posted" },
    { n: "Sita", s: "Joined" },
    { n: "Bikash", s: "Code used" },
    { n: "Anita", s: "Pending" },
  ];
  return (
    <>
      <QuickRow
        items={[
          { icon: "copy-outline", label: "Copy", onPress: () => Alert.alert("Copied", code) },
          { icon: "logo-whatsapp", label: "WhatsApp", onPress: () => void Share.share({ message: `Join NAJIK with ${code}` }) },
          { icon: "chatbubble-outline", label: "SMS", onPress: () => Alert.alert("SMS", "Demo share.") },
          { icon: "qr-code-outline", label: "QR", onPress: () => Alert.alert("QR", "Show this code at your shop.") },
        ]}
      />
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
        <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 12 }}>Your invite code</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <Text style={{ flex: 1, fontSize: 22, fontWeight: "800", letterSpacing: 1 }}>{code}</Text>
          <PressScale onPress={() => Alert.alert("Copied", code)} style={{ backgroundColor: GREEN, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Copy</Text>
          </PressScale>
        </View>
        <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 12, lineHeight: 18 }}>Friends who join as providers earn you Rs. 200 after their first listing.</Text>
      </View>
      <StatStrip
        items={[
          { n: "12", l: "Invites sent" },
          { n: "4", l: "Joined" },
          { n: "Rs. 800", l: "Earned" },
        ]}
      />
      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 18 }}>How it works</Text>
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 10, gap: 8 }}>
        {[
          { n: "1", t: "Share code" },
          { n: "2", t: "They join" },
          { n: "3", t: "You earn" },
        ].map((item) => (
          <View key={item.n} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", ...shadow.card }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{item.n}</Text>
            </View>
            <Text style={{ fontWeight: "700", fontSize: 11, marginTop: 8 }}>{item.t}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 18 }}>Recent invites</Text>
      {friends.map((row) => (
        <View key={row.n} style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", ...shadow.card }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontWeight: "800", color: GREEN }}>{row.n[0]}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontWeight: "800", fontSize: 13 }}>{row.n}</Text>
            <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>{row.s}</Text>
          </View>
          <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{row.s === "Pending" ? "—" : "Rs. 200"}</Text>
        </View>
      ))}
    </>
  );
}

function StatStrip({ items }: { items: { n: string; l: string }[] }) {
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 14, gap: 8 }}>
      {items.map((item) => (
        <View key={item.l} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, ...shadow.card }}>
          <Text style={{ fontWeight: "800", fontSize: 18, color: GREEN }}>{item.n}</Text>
          <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>{item.l}</Text>
        </View>
      ))}
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { fg: string; bg: string }> = {
    Upcoming: { fg: "#2563EB", bg: "#E8F1FE" },
    Confirmed: { fg: GREEN, bg: "#E7F6EC" },
    Completed: { fg: "#6B7280", bg: "#F3F4F6" },
    Cancelled: { fg: colors.red, bg: "#FDECEC" },
  };
  const t = map[status] ?? map.Completed;
  return (
    <View style={{ backgroundColor: t.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
      <Text style={{ color: t.fg, fontSize: 10, fontWeight: "800" }}>{status}</Text>
    </View>
  );
}

function MiniBtn({ label, onPress, fill, danger }: { label: string; onPress: () => void; fill?: boolean; danger?: boolean }) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        marginTop: fill || danger ? 10 : 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: fill ? GREEN : danger ? "#FDECEC" : "#F3F4F6",
        alignItems: "center",
        flex: 1,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 12, color: fill ? "#fff" : danger ? colors.red : "#374151" }}>{label}</Text>
    </PressScale>
  );
}

function SettingRow({ icon, title, value, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string; last?: boolean }) {
  return (
    <PressScale
      onPress={() => Alert.alert(title, value)}
      style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: "#F0F1F3" }}
    >
      <Ionicons name={icon} size={18} color={GREEN} />
      <Text style={{ flex: 1, marginLeft: 10, fontWeight: "700", color: "#111827" }}>{title}</Text>
      <Text style={{ color: "#6B7280", fontSize: 12, marginRight: 6 }}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color="#C4C7CC" />
    </PressScale>
  );
}

function ToggleRow({
  icon,
  title,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F0F1F3" }}>
      <Ionicons name={icon} size={18} color={GREEN} />
      <Text style={{ flex: 1, marginLeft: 10, fontWeight: "700", color: "#111827" }}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#E6E8EC", true: "#A8E0B8" }} thumbColor={value ? GREEN : "#f4f3f4"} />
    </View>
  );
}
