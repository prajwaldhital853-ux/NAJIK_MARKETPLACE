import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { AuthImage } from "../components/AuthImage";
import { SalePrice } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { canPostServices, isPendingProvider } from "../demo";
import { discountedAmount, listingDiscountPercent, uniqueLabels } from "../data/liveListings";
import { fetchMyListings, deleteMyListing, setListingSold, setListingSoldCount, type ApiListing } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openListing, openSellerPage } from "../navigation/browse";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const houseArt = require("../../assets/hero/house.png");

type FilterKey = "all" | "active" | "pending" | "sold" | "expired";
type SortKey = "newest" | "price-high" | "price-low" | "title";

function extraText(item: ApiListing, key: string) {
  const value = item.extras?.[key];
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
}

function extraNum(item: ApiListing, key: string) {
  const n = Number(item.extras?.[key]);
  return Number.isFinite(n) ? n : 0;
}

function extraList(item: ApiListing, key: string) {
  const value = item.extras?.[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function dealTypeOf(item: ApiListing) {
  return extraText(item, "dealType") || item.subcategory || item.category;
}

function rupees(value: string) {
  const n = Number(String(value).replace(/\D/g, ""));
  if (!String(value).replace(/\D/g, "")) return "Price on request";
  return `Rs. ${Number.isFinite(n) ? n.toLocaleString("en-IN") : value}`;
}

function listingSale(item: ApiListing) {
  const percent = listingDiscountPercent(item.extras);
  const original = rupees(item.price);
  if (!percent) return { amount: original, original: undefined as string | undefined, percent: undefined as number | undefined };
  const sale = discountedAmount(item.price, percent);
  return { amount: sale || original, original, percent };
}

function postedOn(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isSold(item: ApiListing) {
  return extraText(item, "sold") === "true" || item.extras?.sold === true;
}

function statusLabel(item: ApiListing) {
  if (isSold(item)) return "Sold";
  if (item.status === "approved") return "Active";
  if (item.status === "pending") return "Pending";
  if (item.status === "draft") return "Draft";
  return "Rejected";
}

function matchesFilter(item: ApiListing, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "active") return item.status === "approved" && !isSold(item);
  if (filter === "pending") return item.status === "pending" || item.status === "draft";
  if (filter === "sold") return isSold(item);
  if (filter === "expired") return item.status === "rejected";
  return true;
}

export function ListingsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const pending = isPendingProvider(user);
  const canPost = canPostServices(user);
  const refreshControl = useAppRefreshControl();

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: "#F7F8FA", borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <View style={{ height: 86, flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
            <Text style={{ fontSize: 21, fontWeight: "800", color: colors.navy }}>My Listings</Text>
            <Text style={{ color: "#8A8F98", marginTop: 3, fontSize: 10.5, lineHeight: 14 }}>
              Manage your properties and track performance
            </Text>
          </View>
          <Image source={houseArt} style={{ width: 82, height: 62, resizeMode: "contain" }} />
          <PressScale
            onPress={() => canPost && navigation.jumpTo("Post")}
            style={{
              marginLeft: 6,
              width: 100,
              backgroundColor: GREEN,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              opacity: canPost ? 1 : 0.45,
              ...shadow.fab,
            }}
          >
            <View
              style={{
                width: 15,
                height: 15,
                borderRadius: 8,
                borderWidth: 1.4,
                borderColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={10} color="#fff" />
            </View>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Add Listing</Text>
          </PressScale>
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 28 }}
      >
        {canPost ? (
          <VerifiedBody />
        ) : (
          <View style={{ marginTop: 8, backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 16, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>{pending ? "Verification pending" : "Cannot post yet"}</Text>
            <Text style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
              You will see listings here after NAJIK admin verifies your account.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function VerifiedBody() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");
  const [grid, setGrid] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const [live, setLive] = useState<ApiListing[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback((silent = false) => {
    void fetchMyListings()
      .then((rows) => {
        setLive(rows);
        setError("");
      })
      .catch((err) => {
        if (!silent) {
          setLive([]);
          setError(err instanceof Error ? err.message : "Could not load listings.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return subscribeListingsChanged(() => load(true));
  }, [load]);

  const counts = useMemo(
    () => ({
      all: live.length,
      active: live.filter((item) => item.status === "approved").length,
      pending: live.filter((item) => item.status === "pending" || item.status === "draft").length,
      sold: live.filter((item) => extraText(item, "sold") === "true" || extraText(item, "rented") === "true").length,
      expired: live.filter((item) => item.status === "rejected").length,
    }),
    [live],
  );

  const pills: { key: FilterKey; label: string }[] = [
    { key: "all", label: `All Listings (${counts.all})` },
    { key: "active", label: `Active (${counts.active})` },
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "sold", label: `Sold/Rented (${counts.sold})` },
    { key: "expired", label: `Expired (${counts.expired})` },
  ];

  const views = live.reduce((sum, item) => sum + (item.view_count || extraNum(item, "views")), 0);
  const inquiries = live.reduce((sum, item) => sum + (item.comment_count || extraNum(item, "inquiries")), 0);
  const saved = live.reduce((sum, item) => sum + (item.save_count || 0), 0);

  const stats = [
    { icon: "home", color: GREEN, bg: "#E4F6EA", value: String(counts.all), label: "Total Listings", trend: "All time" },
    { icon: "eye", color: "#2563EB", bg: "#E8F1FE", value: compact(views), label: "Total Views", trend: "From your listings" },
    { icon: "chatbubble", color: "#EA580C", bg: "#FFF1E0", value: String(inquiries), label: "Total Inquiries", trend: "From your listings" },
    { icon: "bookmark", color: "#7C3AED", bg: "#F1E9FF", value: String(saved), label: "Saved Listings", trend: "Buyer saves" },
  ];

  const liveList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = live.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      const hay = `${item.title} ${item.location} ${item.subcategory} ${dealTypeOf(item)} ${item.admin_reason}`.toLowerCase();
      return !q || hay.includes(q);
    });
    return filtered.sort((a, b) => {
      const pa = Number(String(a.price).replace(/\D/g, "")) || 0;
      const pb = Number(String(b.price).replace(/\D/g, "")) || 0;
      if (sort === "price-high") return pb - pa;
      if (sort === "price-low") return pa - pb;
      if (sort === "title") return a.title.localeCompare(b.title);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [live, filter, query, sort]);

  const insight =
    counts.pending > 0
      ? `You have ${counts.pending} listing${counts.pending === 1 ? "" : "s"} waiting for admin approval. They turn active here on their own when approved.`
      : counts.active > 0
        ? `Your listings are live in the buyer feed. ${counts.active} active right now.`
        : "Publish a listing from Add Listing. It stays pending until admin approval.";

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 }}>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 38,
            borderWidth: 1,
            borderColor: "#E6E8EC",
          }}
        >
          <Ionicons name="search" size={16} color="#9AA0A6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by title, location or type..."
            placeholderTextColor="#9AA0A6"
            style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy, paddingVertical: 0 }}
          />
        </View>
        <Tool icon="funnel-outline" label="Filter" onPress={() => setSheet("filter")} active={filter !== "all"} />
        <Tool icon="swap-vertical-outline" label="Sort" onPress={() => setSheet("sort")} active={sort !== "newest"} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 12, paddingRight: 8 }}>
        {pills.map((item) => {
          const on = item.key === filter;
          return (
            <PressScale
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={{
                backgroundColor: on ? GREEN : "#fff",
                borderWidth: 1,
                borderColor: on ? GREEN : "#E6E8EC",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                flexShrink: 0,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: on ? "#fff" : "#4B5563", fontWeight: "700", fontSize: 12 }}>{item.label}</Text>
            </PressScale>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 6 }}>
        {stats.map((item) => (
          <View key={item.label} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 7, paddingVertical: 8, ...shadow.card }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={10} color={item.color} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.navy }}>{item.value}</Text>
            </View>
            <Text style={{ color: "#6B7280", fontSize: 8.5, marginTop: 4 }} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={{ color: "#9AA0A6", fontSize: 7.5, marginTop: 2, fontWeight: "700" }} numberOfLines={1}>
              {item.trend}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: 14,
          backgroundColor: "#E7F6EC",
          borderRadius: 16,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bar-chart" size={16} color="#fff" />
        </View>
        <Text style={{ flex: 1, color: colors.navy, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>{insight}</Text>
        <PressScale
          onPress={() => setFilter(counts.pending ? "pending" : "active")}
          style={{ backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: GREEN }}
        >
          <Text style={{ color: GREEN, fontWeight: "800", fontSize: 11 }}>View Insights ›</Text>
        </PressScale>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.navy }}>Your Listings</Text>
        <View style={{ flexDirection: "row", backgroundColor: "#EEF2F4", borderRadius: 10, padding: 3 }}>
          <PressScale onPress={() => setGrid(false)} style={{ padding: 6, borderRadius: 8, backgroundColor: !grid ? GREEN : "transparent" }}>
            <Ionicons name="list" size={15} color={!grid ? "#fff" : "#9AA0A6"} />
          </PressScale>
          <PressScale onPress={() => setGrid(true)} style={{ padding: 6, borderRadius: 8, backgroundColor: grid ? GREEN : "transparent" }}>
            <Ionicons name="grid-outline" size={15} color={grid ? "#fff" : "#9AA0A6"} />
          </PressScale>
        </View>
      </View>

      {error ? <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text> : null}

      {loading && !live.length ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 28, alignItems: "center", marginTop: 8 }}>
          <ActivityIndicator color={GREEN} />
          <Text style={{ color: "#8A8F98", marginTop: 10, fontSize: 13 }}>Loading your listings…</Text>
        </View>
      ) : liveList.length ? (
        grid ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {liveList.map((item) => (
              <View key={item.id} style={{ width: "48%" }}>
                <ListingManageCard
                  item={item}
                  compact
                  onOpen={() => openListing(navigation, item.id, true)}
                  onPromote={() => openSellerPage(navigation, "promotions")}
                  onSold={() => {
                    const next = !isSold(item);
                    void setListingSold(item.id, next).catch((err) =>
                      Alert.alert("Update failed", err instanceof Error ? err.message : "Could not update listing."),
                    );
                  }}
                  onDelete={() => confirmDeleteListing(item)}
                />
              </View>
            ))}
          </View>
        ) : (
          liveList.map((item) => (
            <ListingManageCard
              key={item.id}
              item={item}
              onOpen={() => openListing(navigation, item.id, true)}
              onPromote={() => openSellerPage(navigation, "promotions")}
              onSold={() => {
                const next = !isSold(item);
                void setListingSold(item.id, next).catch((err) =>
                  Alert.alert("Update failed", err instanceof Error ? err.message : "Could not update listing."),
                );
              }}
              onDelete={() => confirmDeleteListing(item)}
            />
          ))
        )
      ) : (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", marginTop: 8 }}>
          <Text style={{ fontWeight: "800", color: colors.navy }}>No listings in this filter</Text>
          <Text style={{ color: "#8A8F98", marginTop: 4, fontSize: 12, textAlign: "center" }}>
            Submit a listing from Add Listing. Pending posts appear here until admin approves them.
          </Text>
        </View>
      )}

      <View
        style={{
          marginTop: 4,
          marginBottom: 8,
          backgroundColor: "#EEF0FF",
          borderRadius: 16,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#DDE1FF", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="rocket" size={18} color="#4F46E5" />
        </View>
        <Text style={{ flex: 1, fontWeight: "700", color: colors.navy, fontSize: 12, lineHeight: 17 }}>
          Want to sell or rent faster? Promote your listing and reach more potential customers.
        </Text>
        <PressScale
          onPress={() => openSellerPage(navigation, "promotions")}
          style={{ backgroundColor: "#fff", borderWidth: 1.5, borderColor: GREEN, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16 }}
        >
          <Text style={{ color: GREEN, fontWeight: "800", fontSize: 11 }}>Promote Listing</Text>
        </PressScale>
      </View>

      <Modal visible={sheet !== null} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <PressScale onPress={() => setSheet(null)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 }}>
            <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 12 }}>{sheet === "sort" ? "Sort listings" : "Filter listings"}</Text>
            {sheet === "filter"
              ? pills.map((item) => (
                  <PressScale
                    key={item.key}
                    onPress={() => {
                      setFilter(item.key);
                      setSheet(null);
                    }}
                    style={{ paddingVertical: 12, flexDirection: "row", justifyContent: "space-between" }}
                  >
                    <Text style={{ fontWeight: "700", color: filter === item.key ? GREEN : colors.navy }}>{item.label}</Text>
                    {filter === item.key ? <Ionicons name="checkmark" size={18} color={GREEN} /> : null}
                  </PressScale>
                ))
              : (
                  [
                    { key: "newest" as const, label: "Newest first" },
                    { key: "price-high" as const, label: "Price: high to low" },
                    { key: "price-low" as const, label: "Price: low to high" },
                    { key: "title" as const, label: "Title A–Z" },
                  ] as const
                ).map((item) => (
                  <PressScale
                    key={item.key}
                    onPress={() => {
                      setSort(item.key);
                      setSheet(null);
                    }}
                    style={{ paddingVertical: 12, flexDirection: "row", justifyContent: "space-between" }}
                  >
                    <Text style={{ fontWeight: "700", color: sort === item.key ? GREEN : colors.navy }}>{item.label}</Text>
                    {sort === item.key ? <Ionicons name="checkmark" size={18} color={GREEN} /> : null}
                  </PressScale>
                ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

function compact(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

function Tool({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: active ? GREEN : "#E6E8EC",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 8,
        height: 38,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        flexShrink: 0,
      }}
    >
      <Ionicons name={icon} size={14} color={active ? GREEN : "#4B5563"} />
      <Text style={{ fontSize: 11, fontWeight: "700", color: active ? GREEN : "#4B5563" }}>{label}</Text>
    </PressScale>
  );
}

function confirmDeleteListing(item: ApiListing) {
  if (item.is_boosted) {
    Alert.alert(
      "Boost is live",
      "Pause the boost first (Promotions → Pause boost), then you can delete this listing.",
    );
    return;
  }
  Alert.alert("Delete listing", `Remove “${item.title}” permanently? This also removes it from the admin panel.`, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => {
        void deleteMyListing(item.id).catch((err) =>
          Alert.alert("Delete failed", err instanceof Error ? err.message : "Could not delete listing."),
        );
      },
    },
  ]);
}

function ListingManageCard({
  item,
  onOpen,
  onPromote,
  onSold,
  onDelete,
  compact,
}: {
  item: ApiListing;
  onOpen: () => void;
  onPromote: () => void;
  onSold: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const pending = item.status === "pending" || item.status === "draft";
  const rejected = item.status === "rejected";
  const sold = isSold(item);
  const soldCount = extraNum(item, "sold_count");
  const [soldCountOpen, setSoldCountOpen] = useState(false);
  const [soldCountInput, setSoldCountInput] = useState(soldCount > 0 ? String(soldCount) : "");
  const [soldCountBusy, setSoldCountBusy] = useState(false);
  const status = statusLabel(item);
  const statusColor = sold ? "#DC2626" : pending ? "#F59E0B" : rejected ? colors.red : GREEN;
  const deal = dealTypeOf(item);
  const sale = listingSale(item);
  const statusBadges: { label: string; bg: string; fg: string }[] = [];
  if (item.is_urgent) statusBadges.push({ label: "URGENT", bg: "#EAB308", fg: "#111827" });
  if (item.is_boosted || item.is_promoted) statusBadges.push({ label: item.is_boosted ? "BOOSTED" : "FEATURED", bg: "#EA580C", fg: "#fff" });
  else if (item.boost_paused) statusBadges.push({ label: "BOOST PAUSED", bg: "#9CA3AF", fg: "#fff" });
  else if (item.status === "approved") statusBadges.push({ label: "VERIFIED", bg: "#2563EB", fg: "#fff" });
  else if (pending) statusBadges.push({ label: "PENDING", bg: "#F59E0B", fg: "#fff" });
  const beds = extraText(item, "beds");
  const baths = extraText(item, "baths");
  const area = extraText(item, "area");
  const features = extraList(item, "features");
  const company = extraText(item, "company");
  const experience = extraText(item, "experience");
  const year = extraText(item, "year");
  const km = extraText(item, "km");
  const fuel = extraText(item, "fuel");
  const rateType = extraText(item, "rateType");
  const metaItems = uniqueLabels(
    features.length
      ? features.slice(0, 3)
      : [beds ? `${beds} Beds` : "", baths ? `${baths} Baths` : "", area ? `${area} sqft` : "", company, experience, year, km ? `${km} km` : "", fuel, rateType],
  ).slice(0, 3);

  const photoUrl = item.photos[0]?.url;
  return (
    <>
    <PressScale
      onPress={onOpen}
      style={{ backgroundColor: "#fff", borderRadius: 16, padding: 10, marginBottom: 12, flexDirection: compact || !photoUrl ? "column" : "row", ...shadow.card }}
    >
      {photoUrl ? (
      <View>
        <AuthImage uri={photoUrl} style={{ width: compact ? "100%" : 104, height: compact ? 96 : 112, borderRadius: 12 } as any} />
        {statusBadges.length ? (
          <View style={{ position: "absolute", top: 7, left: 7, gap: 4, zIndex: 1 }}>
            {statusBadges.map((badge) => (
              <View key={badge.label} style={{ backgroundColor: badge.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" }}>
                <Text style={{ color: badge.fg, fontSize: 8, fontWeight: "800", letterSpacing: 0.3 }}>{badge.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {sold ? (
          <View
            style={{
              position: "absolute",
              top: statusBadges.length ? 7 + statusBadges.length * 18 : 7,
              left: 7,
              backgroundColor: "#DC2626",
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 6,
              zIndex: 1,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 0.3 }}>SOLD</Text>
          </View>
        ) : null}
        <View
          style={{
            position: "absolute",
            right: 7,
            top: 7,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <Ionicons name="heart-outline" size={13} color="#374151" />
        </View>
        <View
          style={{
            position: "absolute",
            left: 7,
            bottom: 7,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 10,
            paddingHorizontal: 7,
            paddingVertical: 3,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="eye" size={10} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{item.view_count || extraNum(item, "views")}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="chatbubble" size={9} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{item.comment_count || extraNum(item, "inquiries")}</Text>
          </View>
        </View>
      </View>
      ) : null}

      <View style={{ flex: 1, paddingLeft: compact || !photoUrl ? 0 : 12, paddingTop: compact || !photoUrl ? (photoUrl ? 8 : 2) : 2 }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor }}>{status}</Text>
        </View>
        <Text style={{ fontWeight: "800", fontSize: 13, color: colors.navy, marginTop: 2 }} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={12} color="#9AA0A6" />
          <Text style={{ color: "#8A8F98", fontSize: 11 }} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
          <SalePrice amount={sale.amount} originalPrice={sale.original} discountPercent={sale.percent} compact />
          <View
            style={{
              backgroundColor: sold ? "#FEE2E2" : deal === "For Rent" ? "#E8F1FE" : "#E4F6EA",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: sold ? "#DC2626" : deal === "For Rent" ? "#2563EB" : "#146B32", fontSize: 10, fontWeight: "800" }}>
              {sold ? "Sold" : deal}
            </Text>
          </View>
          {soldCount > 0 ? (
            <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "700" }}>{soldCount.toLocaleString("en-IN")} sold</Text>
          ) : null}
        </View>
        {metaItems.length ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
            {metaItems.map((text, index) => (
              <Meta key={`${text}-${index}`} icon={metaIcon(text)} text={text} />
            ))}
          </View>
        ) : null}
        {rejected && item.admin_reason ? (
          <Text style={{ marginTop: 6, color: colors.red, fontSize: 11 }} numberOfLines={2}>
            {item.admin_reason}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <Text style={{ color: "#9AA0A6", fontSize: 10 }}>Posted on {postedOn(item.created_at)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PressScale onPress={onOpen} style={{ borderWidth: 1.5, borderColor: GREEN, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
              <Text style={{ color: GREEN, fontWeight: "800", fontSize: 10.5 }}>Manage</Text>
            </PressScale>
            <PressScale
              onPress={() =>
                Alert.alert(item.title, undefined, [
                  { text: isSold(item) ? "Mark as active" : "Mark as sold", onPress: onSold },
                  {
                    text: "Add sold number",
                    onPress: () => {
                      setSoldCountInput(soldCount > 0 ? String(soldCount) : "");
                      setSoldCountOpen(true);
                    },
                  },
                  { text: "Promote", onPress: onPromote },
                  { text: "Delete listing", style: "destructive", onPress: onDelete },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            >
              <Ionicons name="ellipsis-vertical" size={14} color="#1B7D2C" />
            </PressScale>
          </View>
        </View>
      </View>
    </PressScale>
    <Modal visible={soldCountOpen} transparent animationType="fade" onRequestClose={() => setSoldCountOpen(false)}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "center", padding: 24 }}
        onPress={() => setSoldCountOpen(false)}
      >
        <Pressable
          onPress={() => undefined}
          style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16 }}
        >
          <Text style={{ fontWeight: "800", fontSize: 16, color: "#111827" }}>Sold number</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
            Shown next to reviews, like “100 sold”. Leave blank to hide it.
          </Text>
          <TextInput
            value={soldCountInput}
            onChangeText={(v) => setSoldCountInput(v.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder="e.g. 50"
            placeholderTextColor="#9AA0A6"
            style={{
              marginTop: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              paddingHorizontal: 12,
              height: 44,
              fontWeight: "700",
              color: "#111827",
            }}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <PressScale
              onPress={() => setSoldCountOpen(false)}
              style={{ flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, height: 42, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontWeight: "800", color: "#374151" }}>Cancel</Text>
            </PressScale>
            <PressScale
              onPress={() => {
                const n = soldCountInput.trim() ? Number(soldCountInput) : 0;
                setSoldCountBusy(true);
                void setListingSoldCount(item.id, n > 0 ? n : null)
                  .then(() => setSoldCountOpen(false))
                  .catch((err) => Alert.alert("Update failed", err instanceof Error ? err.message : "Could not save sold number."))
                  .finally(() => setSoldCountBusy(false));
              }}
              style={{
                flex: 1,
                backgroundColor: GREEN,
                borderRadius: 10,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                opacity: soldCountBusy ? 0.6 : 1,
              }}
            >
              <Text style={{ fontWeight: "800", color: "#fff" }}>{soldCountBusy ? "Saving…" : "Save"}</Text>
            </PressScale>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

function metaIcon(text: string): keyof typeof Ionicons.glyphMap {
  const value = text.toLowerCase();
  if (value.includes("bed")) return "bed-outline";
  if (value.includes("bath")) return "water-outline";
  if (value.includes("park") || value.includes("car")) return "car-outline";
  if (value.includes("kitchen")) return "restaurant-outline";
  if (value.includes("aana") || value.includes("ropani")) return "map-outline";
  if (value.includes("floor")) return "business-outline";
  return "resize-outline";
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Ionicons name={icon} size={11} color="#9AA0A6" />
      <Text style={{ color: "#6B7280", fontSize: 10 }}>{text}</Text>
    </View>
  );
}
