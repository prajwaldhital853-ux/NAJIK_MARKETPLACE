import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { SellerHeroBanner } from "../components/SellerHeroBanner";
import { SellerProfileEditModal } from "../components/SellerProfileEditModal";
import { AccountStatusCard, ListingAdminNotesCard, StaffWarningCard } from "../components/StaffWarningBanner";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider, isAccountRestricted } from "../demo";
import { fetchMyListings, fetchSellerProfile, type ApiListing } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openProviderIdCard, openSellerPage } from "../navigation/browse";
import { choosePhoto } from "../pickPhoto";
import { colors, shadow } from "../theme";

const skyline = require("../../assets/login-skyline.png");
const GAP = 8;
const PAD = 16;
const CARD_W = (Dimensions.get("window").width - PAD * 2 - GAP * 3) / 4;
const GREEN = "#1B7D2C";

function memberSince(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function prettyProfileKey(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F0F1F3" }}>
      <Text style={{ width: 120, color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ flex: 1, fontWeight: "600", fontSize: 13, color: colors.navy }}>{value}</Text>
    </View>
  );
}

const servicesBase: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  tab?: string;
  page?: "bookings" | "reviews";
}[] = [
  { icon: "home", color: "#1B7D2C", bg: "#E4F6EA", title: "My Listings", tab: "Listings" },
  { icon: "chatbubbles", color: "#1B7D2C", bg: "#E4F6EA", title: "Inquiries", tab: "Inquiries" },
  { icon: "calendar", color: "#2563EB", bg: "#E8F1FE", title: "Bookings", page: "bookings" },
  { icon: "star", color: "#EA580C", bg: "#FFF1E0", title: "Reviews", page: "reviews" },
];

const actions: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  tab?: string;
  page?: "promotions" | "services" | "earnings" | "messages" | "kyc" | "settings" | "idcard";
}[] = [
  { icon: "add", color: "#fff", bg: "#1B7D2C", title: "Add New Listing", tab: "Post" },
  { icon: "id-card", color: "#1B7D2C", bg: "#E4F6EA", title: "My ID Card", page: "idcard" },
  { icon: "settings", color: "#7C3AED", bg: "#F1E9FF", title: "Manage Services", page: "services" },
  { icon: "megaphone", color: "#EA580C", bg: "#FFF1E0", title: "Promote Listing", page: "promotions" },
  { icon: "stats-chart", color: "#1B7D2C", bg: "#E4F6EA", title: "Earnings Report", page: "earnings" },
  { icon: "chatbubble-ellipses", color: "#2563EB", bg: "#E8F1FE", title: "Inbox", page: "messages" },
  { icon: "wallet", color: "#7C3AED", bg: "#F1E9FF", title: "Wallet", page: "earnings" },
  { icon: "shield-checkmark", color: "#1B7D2C", bg: "#E4F6EA", title: "Verification & KYC", page: "kyc" },
  { icon: "settings-outline", color: "#64748B", bg: "#EEF2F6", title: "Settings", page: "settings" },
];

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [myListings, setMyListings] = useState<ApiListing[]>([]);
  const [sellerRating, setSellerRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const name = user?.full_name || "Account";
  const pending = isPendingProvider(user);
  const verified = isVerifiedProvider(user);
  const rejected = isRejectedProvider(user);
  const photo = user?.photo_uri || "";

  useEffect(() => {
    if (!isProvider(user)) {
      setActiveCount(0);
      setPendingCount(0);
      setMyListings([]);
      return;
    }
    const load = () => {
      void fetchMyListings()
        .then((rows) => {
          setMyListings(rows);
          setActiveCount(rows.filter((row) => row.status === "approved").length);
          setPendingCount(rows.filter((row) => row.status === "pending").length);
        })
        .catch(() => {});
      if (user?.id) {
        void fetchSellerProfile(user.id)
          .then((profile) => setSellerRating({ avg: profile.rating_avg ?? 0, count: profile.review_count ?? 0 }))
          .catch(() => setSellerRating({ avg: 0, count: 0 }));
      }
    };
    load();
    return subscribeListingsChanged(load);
  }, [user?.id, verified]);

  const refreshControl = useAppRefreshControl();

  if (!isProvider(user)) {
    return <BuyerProfile />;
  }

  const stats = [
    { icon: "home-outline" as const, value: String(activeCount), label: "Active Listings" },
    { icon: "star-outline" as const, value: sellerRating.avg > 0 ? sellerRating.avg.toFixed(1) : "—", label: `Rating (${sellerRating.count})` },
    { icon: "hourglass-outline" as const, value: String(pendingCount), label: "Pending" },
    { icon: "chatbubble-outline" as const, value: "0", label: "Inquiries" },
  ];
  const services = servicesBase.map((item) => ({
    ...item,
    count: item.title === "My Listings" ? String(activeCount) : "0",
  }));

  function openEdit() {
    if (verified || rejected) {
      setEditOpen(true);
      return;
    }
    Alert.alert("Wait for verification", "You can edit name, address and documents after admin verifies you, or if your application was rejected.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell" />
      <SellerProfileEditModal visible={editOpen} onClose={() => setEditOpen(false)} />
      <Modal visible={detailsOpen} animationType="slide" transparent onRequestClose={() => setDetailsOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setDetailsOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "88%", padding: 16, paddingBottom: 28 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: colors.navy }}>Full profile</Text>
              <PressScale onPress={() => setDetailsOpen(false)}>
                <Ionicons name="close" size={22} color={colors.navy} />
              </PressScale>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <DetailRow label="Full name" value={user?.full_name || "—"} />
              <DetailRow label="Phone" value={user?.phone || "—"} />
              <DetailRow label="Email" value={user?.email || "—"} />
              <DetailRow label="Service" value={String(user?.service_type || "—")} />
              <DetailRow label="Address" value={user?.address || "—"} />
              <DetailRow label="Contact" value={user?.contact || "—"} />
              <DetailRow label="Member since" value={memberSince(user?.date_joined)} />
              <DetailRow label="Account status" value={user?.account_status || (verified ? "active" : pending ? "pending" : rejected ? "rejected" : "—")} />
              <DetailRow label="KYC" value={user?.verification_status || "—"} />
              {Object.entries(user?.profile_data || {})
                .filter(([, value]) => String(value || "").trim())
                .map(([key, value]) => (
                  <DetailRow key={key} label={prettyProfileKey(key)} value={String(value)} />
                ))}
              {verified || rejected ? (
                <PressScale
                  onPress={() => {
                    setDetailsOpen(false);
                    openEdit();
                  }}
                  style={{ marginTop: 16, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Edit profile</Text>
                </PressScale>
              ) : null}
              <PressScale
                onPress={() => {
                  setDetailsOpen(false);
                  if (isAccountRestricted(user)) {
                    Alert.alert("Account restricted", "Your account is deactivated or blocked. You cannot open your ID card.");
                    return;
                  }
                  openProviderIdCard(navigation);
                }}
                style={{ marginTop: 10, borderWidth: 1.5, borderColor: GREEN, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ color: GREEN, fontWeight: "800" }}>Open My ID Card</Text>
              </PressScale>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: "#F7F8FA", borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <SellerHeroBanner
          name={name}
          photo={photo}
          serviceType={user?.service_type}
          verified={verified}
          pending={pending}
          rejected={rejected}
          variant="profile"
          onPress={() => setDetailsOpen(true)}
          onCamera={openEdit}
        />
      </View>
      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <AccountStatusCard />
        <StaffWarningCard />
        <ListingAdminNotesCard listings={myListings} />
        {pending ? (
          <View style={{ backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Verification pending</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
              Admin is reviewing your nagrita, photo and details. You cannot post yet. This screen updates on its own when you are verified.
            </Text>
          </View>
        ) : null}
        {rejected ? (
          <View style={{ backgroundColor: colors.redSoft, borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Application rejected</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
              {user?.rejection_note?.trim()
                ? user.rejection_note
                : "You cannot post services until a new application is approved."}
            </Text>
            <PressScale
              onPress={openEdit}
              style={{
                marginTop: 12,
                alignSelf: "flex-start",
                backgroundColor: GREEN,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Edit and resubmit</Text>
            </PressScale>
          </View>
        ) : null}

        {user?.has_pending_edit ? (
          <View style={{ backgroundColor: "#FFF7E6", borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Profile edit in review</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
              Admin is checking your updated details. Your live profile stays as-is until they approve.
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 0, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
          <Text style={{ fontWeight: "800", color: colors.navy, marginBottom: 10 }}>Profile</Text>
          <DetailRow label="Name" value={user?.full_name || "—"} />
          <DetailRow label="Phone" value={user?.phone || "—"} />
          <DetailRow label="Email" value={user?.email || "—"} />
          <DetailRow label="Service type" value={String(user?.service_type || "—")} />
          <PressScale onPress={() => setDetailsOpen(true)} style={{ marginTop: 10 }}>
            <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>Tap profile bar for full details ›</Text>
          </PressScale>
        </View>

        <View style={{ marginTop: 10, backgroundColor: "#0D4A2A", borderRadius: 14, paddingVertical: 12, flexDirection: "row" }}>
          {stats.map((item, index) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                alignItems: "center",
                borderRightWidth: index === stats.length - 1 ? 0 : 1,
                borderRightColor: "rgba(255,255,255,0.16)",
              }}
            >
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={15} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginTop: 4 }}>{item.value}</Text>
              <Text style={{ color: "#C9F0D4", fontSize: 8.5, textAlign: "center", marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.navy }}>Manage Your Services</Text>
          <Text style={{ color: "#1B7D2C", fontWeight: "700", fontSize: 12 }}>View all</Text>
        </View>
        <View style={{ flexDirection: "row", gap: GAP }}>
          {services.map((item) => (
            <PressScale
              key={item.title}
              onPress={() => {
                if (item.page) openSellerPage(navigation, item.page);
                else if (item.tab) navigation.jumpTo(item.tab);
              }}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 4,
                alignItems: "center",
                ...shadow.card,
              }}
            >
              <View>
                <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.icon} size={32} color={item.color} />
                </View>
              </View>
              <Text style={{ fontSize: 11, fontWeight: "700", marginTop: 8, textAlign: "center", color: colors.navy }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ color: "#1B7D2C", fontWeight: "800", marginTop: 2, fontSize: 13 }}>{item.count}</Text>
            </PressScale>
          ))}
        </View>

        <Text style={{ fontSize: 15, fontWeight: "800", marginTop: 18, marginBottom: 10, color: colors.navy }}>Quick Actions</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
          {actions.map((item) => (
            <PressScale
              key={item.title}
              onPress={() => {
                if (item.page === "idcard") {
                  if (isAccountRestricted(user)) {
                    Alert.alert("Account restricted", "Your account is deactivated or blocked. You cannot open your ID card.");
                    return;
                  }
                  openProviderIdCard(navigation);
                  return;
                }
                if (isAccountRestricted(user) && (item.tab === "Post" || item.page === "promotions" || item.page === "services")) {
                  Alert.alert("Account restricted", "Your account is deactivated or blocked. Contact NAJIK admin.");
                  return;
                }
                if (item.page) openSellerPage(navigation, item.page);
                else if (item.tab) navigation.jumpTo(item.tab);
              }}
              style={{
                width: CARD_W,
                backgroundColor: "#fff",
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 4,
                alignItems: "center",
                opacity: item.title === "Add New Listing" && !verified ? 0.45 : 1,
                ...shadow.card,
              }}
            >
              <View>
                <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.icon} size={32} color={item.color} />
                </View>
              </View>
              <Text style={{ fontSize: 9.5, fontWeight: "700", marginTop: 7, textAlign: "center", color: colors.navy, lineHeight: 12 }}>
                {item.title}
              </Text>
            </PressScale>
          ))}
        </View>

        <PressScale onPress={logout} style={{ marginTop: 22, alignItems: "center", padding: 12 }}>
          <Text style={{ color: colors.red, fontWeight: "800" }}>Log out</Text>
        </PressScale>
      </ScrollView>
    </View>
  );
}

function BuyerProfile() {
  const { user, updateBuyerPhoto } = useAuth();
  const navigation = useNavigation<any>();
  const name = user?.full_name || "Account";
  const phone = user?.phone ? (user.phone.startsWith("+") ? user.phone : `+977 ${user.phone}`) : "";
  const email = user?.email || "";
  const photo = user?.photo_uri || "";
  const location = user?.address || "";

  const stats = [
    { icon: "heart" as const, color: GREEN, bg: "#E7F6EC", value: "0", label: "Saved Items", tab: "Saved" },
    { icon: "chatbubble-ellipses" as const, color: "#7C3AED", bg: "#F1E9FF", value: "0", label: "Inquiries", tab: "Explore" },
    { icon: "time" as const, color: "#2563EB", bg: "#E8F1FE", value: "0", label: "Recently Viewed", tab: "Explore" },
    { icon: "star" as const, color: "#EA580C", bg: "#FFF1E0", value: "0", label: "Reviews Given", tab: "Explore" },
  ];

  const activity = [
    { icon: "bookmark" as const, color: GREEN, bg: "#E7F6EC", title: "Saved Items", sub: "View your saved listings.", tab: "Saved" },
    { icon: "help-circle" as const, color: "#6D28D9", bg: "#F1E9FF", title: "My Inquiries", sub: "Track your inquiries.", tab: "Explore" },
    { icon: "eye" as const, color: "#1D4ED8", bg: "#E8F1FE", title: "Recently Viewed", sub: "Listings you recently viewed.", tab: "Explore" },
    { icon: "chatbubble" as const, color: "#C2410C", bg: "#FFF1E0", title: "My Reviews", sub: "Reviews you've shared.", tab: "Explore" },
  ];

  const details = [
    { icon: "person-outline" as const, label: "Full Name", value: name },
    { icon: "call-outline" as const, label: "Phone Number", value: phone },
    { icon: "mail-outline" as const, label: "Email Address", value: email },
    { icon: "location-outline" as const, label: "Location", value: location },
    { icon: "calendar-outline" as const, label: "Member Since", value: memberSince(user?.date_joined) },
  ];

  const more = [
    { icon: "notifications" as const, color: GREEN, bg: "#E7F6EC", title: "Notifications" },
    { icon: "shield-checkmark" as const, color: "#2563EB", bg: "#E8F1FE", title: "Security" },
    { icon: "headset" as const, color: "#EA580C", bg: "#FFF1E0", title: "Help & Support" },
    { icon: "settings" as const, color: "#7C3AED", bg: "#F1E9FF", title: "Settings" },
  ];
  const refreshControl = useAppRefreshControl();

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell-settings" showLocation showPro={false} pinColor={GREEN} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: "#F7F8FA", borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <PressScale
          onPress={() => {}}
          style={{
            backgroundColor: "#E7F6EC",
            borderRadius: 18,
            padding: 14,
            overflow: "hidden",
            ...shadow.card,
          }}
        >
          <Image source={skyline} style={{ position: "absolute", right: -8, bottom: -6, width: 170, height: 92, opacity: 0.55 }} resizeMode="contain" />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar
              name={name}
              uri={photo || undefined}
              size={82}
              borderColor={GREEN}
              borderWidth={3}
              onCamera={() =>
                choosePhoto((uri) => {
                  void updateBuyerPhoto(uri).catch((err) =>
                    Alert.alert("Photo", err instanceof Error ? err.message : "Could not save photo."),
                  );
                }, "Profile photo")
              }
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={{ fontWeight: "800", fontSize: 17, color: "#111827" }} numberOfLines={1}>
                  {name}
                </Text>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
              </View>
              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 3 }}>{phone}</Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {email}
              </Text>
              <View
                style={{
                  marginTop: 8,
                  alignSelf: "flex-start",
                  backgroundColor: "#D4EFDC",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons name="checkmark-circle" size={12} color={GREEN} />
                <Text style={{ color: GREEN, fontSize: 11, fontWeight: "700" }}>Verified User</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9AA0A6" />
          </View>
        </PressScale>
      </View>
      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <AccountStatusCard />
        <StaffWarningCard />

        <View style={{ marginTop: 12, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14, flexDirection: "row", ...shadow.card }}>
          {stats.map((item) => (
            <PressScale key={item.label} onPress={() => navigation.jumpTo(item.tab)} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={{ fontWeight: "800", fontSize: 16, color: "#111827", marginTop: 6 }}>{item.value}</Text>
              <Text style={{ color: "#8A8F98", fontSize: 10, textAlign: "center", marginTop: 2 }}>{item.label}</Text>
            </PressScale>
          ))}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>My Activity</Text>
          <Text style={{ color: GREEN, fontWeight: "700", fontSize: 13 }}>View All ›</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {activity.map((item) => (
            <PressScale
              key={item.title}
              onPress={() => navigation.jumpTo(item.tab)}
              style={{
                width: (Dimensions.get("window").width - 16 * 2 - 10) / 2,
                backgroundColor: item.bg,
                borderRadius: 14,
                padding: 12,
              }}
            >
              <Ionicons name={item.icon} size={22} color={item.color} />
              <Text style={{ fontWeight: "800", fontSize: 14, color: "#111827", marginTop: 8 }}>{item.title}</Text>
              <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2, lineHeight: 15 }}>{item.sub}</Text>
            </PressScale>
          ))}
        </View>

        <View style={{ marginTop: 20, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Profile Details</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="pencil" size={13} color={GREEN} />
              <Text style={{ color: GREEN, fontWeight: "700", fontSize: 13 }}>Edit Profile</Text>
            </View>
          </View>
          {details.map((item, index) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: "#F0F1F3",
              }}
            >
              <Ionicons name={item.icon} size={18} color={GREEN} />
              <Text style={{ flex: 1, marginLeft: 10, color: "#6B7280", fontSize: 13 }}>{item.label}</Text>
              <Text style={{ fontWeight: "700", fontSize: 13, color: "#111827", marginRight: 6 }} numberOfLines={1}>
                {item.value}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#C4C7CC" />
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 20, marginBottom: 10 }}>More Options</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {more.map((item) => (
            <PressScale
              key={item.title}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                ...shadow.card,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 6, textAlign: "center", color: "#111827" }}>{item.title}</Text>
            </PressScale>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
