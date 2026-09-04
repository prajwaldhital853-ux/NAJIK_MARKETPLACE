import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Share, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  ACCOUNT_GREEN as GREEN,
  ACCOUNT_PAGE_BG as PAGE_BG,
  AccountMenuRow,
  AccountSection,
  SellerServiceCard,
  SellerServicesHeader,
} from "../components/AccountProfileParts";
import { Avatar } from "../components/Avatar";
import { DataPrivacyActions } from "../components/DataPrivacyActions";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { SellerProfileEditModal } from "../components/SellerProfileEditModal";
import { AccountStatusCard, ListingAdminNotesCard, StaffWarningCard } from "../components/StaffWarningBanner";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider, isAccountRestricted } from "../demo";
import { fetchBookings } from "../bookingsApi";
import { fetchSellerEarningsSummary } from "../earningsApi";
import { infoLinkDocId } from "../legal/types";
import { fetchMyListings, fetchSellerProfile, type ApiListing } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openChatInbox, openProviderIdCard, openSellerPage } from "../navigation/browse";
import { colors } from "../theme";
import { BuyerProfile } from "./BuyerAccountScreen";

function memberSince(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function listingSold(item: ApiListing) {
  return item.extras?.sold === true || String(item.extras?.sold) === "true";
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

function HeaderMetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.82)" />
      <Text style={{ flex: 1, color: "rgba(255,255,255,0.92)", fontSize: 12.5 }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function HeaderChip({
  icon,
  label,
  onPress,
  backgroundColor,
  textColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor,
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 7,
      }}
    >
      <Ionicons name={icon} size={13} color={textColor} />
      <Text style={{ color: textColor, fontWeight: "700", fontSize: 11.5 }} numberOfLines={1}>
        {label}
      </Text>
    </PressScale>
  );
}

function verifyChipMeta(verified: boolean, pending: boolean, rejected: boolean) {
  if (verified) {
    return { label: "Verified seller", bg: "#FCD34D", color: "#78350F", icon: "shield-checkmark" as const };
  }
  if (pending) {
    return { label: "Pending review", bg: "#FDBA74", color: "#7C2D12", icon: "time-outline" as const };
  }
  if (rejected) {
    return { label: "Resubmit KYC", bg: "#FCA5A5", color: "#7F1D1D", icon: "alert-circle-outline" as const };
  }
  return { label: "Get verified", bg: "rgba(255,255,255,0.22)", color: "#fff", icon: "ribbon-outline" as const };
}

function HeaderStat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.9)" />
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginTop: 4 }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 9.5, marginTop: 2, textAlign: "center", fontWeight: "600" }} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [myListings, setMyListings] = useState<ApiListing[]>([]);
  const [sellerRating, setSellerRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [walletLabel, setWalletLabel] = useState("Rs. 0.00");
  const [bookingsCount, setBookingsCount] = useState(0);
  const name = user?.full_name || "Account";
  const email = user?.email || "";
  const pending = isPendingProvider(user);
  const verified = isVerifiedProvider(user);
  const rejected = isRejectedProvider(user);
  const photo = user?.photo_uri || "";

  useEffect(() => {
    if (!isProvider(user)) return;
    const load = () => {
      void fetchMyListings()
        .then(setMyListings)
        .catch(() => setMyListings([]));
      if (user?.id) {
        void fetchSellerProfile(user.id)
          .then((profile) => setSellerRating({ avg: profile.rating_avg ?? 0, count: profile.review_count ?? 0 }))
          .catch(() => setSellerRating({ avg: 0, count: 0 }));
      }
      void fetchSellerEarningsSummary()
        .then((row) => setWalletLabel(row.combined_balance_label || "Rs. 0.00"))
        .catch(() => setWalletLabel("Rs. 0.00"));
      void fetchBookings()
        .then((rows) => setBookingsCount(rows.length))
        .catch(() => setBookingsCount(0));
    };
    load();
    return subscribeListingsChanged(load);
  }, [user?.id, verified]);

  const refreshControl = useAppRefreshControl();

  if (!isProvider(user)) {
    return <BuyerProfile />;
  }

  function openEdit() {
    if (verified || rejected) {
      setEditOpen(true);
      return;
    }
    Alert.alert("Wait for verification", "You can edit name, address and documents after admin verifies you, or if your application was rejected.");
  }

  function openLegal(label: string) {
    const doc = infoLinkDocId(label);
    if (doc) navigation.navigate("LegalDocument", { doc, role: "seller" });
  }

  function confirmLogout() {
    Alert.alert("Log out", "Sign out of this NAJIK account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void logout() },
    ]);
  }

  function goHub(page: Parameters<typeof openSellerPage>[1]) {
    openSellerPage(navigation, page);
  }

  const verifyChip = verifyChipMeta(verified, pending, rejected);
  const memberLabel = memberSince(user?.date_joined);
  const contactEmail = email || user?.email || "";
  const contactPhone = user?.phone || "";

  const activeListings = myListings.filter((item) => item.status === "approved" && !listingSold(item)).length;
  const pendingListings = myListings.filter((item) => item.status === "pending" || item.status === "draft").length;
  const inquiriesCount = myListings.reduce((sum, item) => sum + (item.comment_count || 0), 0);
  const ratingValue = sellerRating.count > 0 ? sellerRating.avg.toFixed(1) : "0.0";
  const ratingLabel = sellerRating.count > 0 ? `Rating (${sellerRating.count})` : "Rating";

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
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
              <DetailRow label="Member since" value={memberSince(user?.date_joined)} />
              <DetailRow label="Rating" value={sellerRating.avg > 0 ? `${sellerRating.avg.toFixed(1)} (${sellerRating.count})` : "—"} />
              {Object.entries(user?.profile_data || {})
                .filter(([, value]) => String(value || "").trim())
                .map(([key, value]) => (
                  <DetailRow key={key} label={prettyProfileKey(key)} value={String(value)} />
                ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ backgroundColor: GREEN }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginBottom: 12 }}>
            <PressScale onPress={confirmLogout} hitSlop={10}>
              <Ionicons name="power" size={22} color="#fff" />
            </PressScale>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Avatar
              name={name}
              uri={photo || undefined}
              size={88}
              borderColor="#fff"
              borderWidth={3}
              editIcon="pencil"
              onCamera={openEdit}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <PressScale onPress={() => setDetailsOpen(true)}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 19 }} numberOfLines={2}>
                  {name}
                </Text>
              </PressScale>
              {contactEmail ? <HeaderMetaRow icon="mail-outline" text={contactEmail} /> : null}
              {!contactEmail && contactPhone ? <HeaderMetaRow icon="call-outline" text={contactPhone} /> : null}
              {contactEmail && contactPhone ? <HeaderMetaRow icon="call-outline" text={contactPhone} /> : null}
              <HeaderMetaRow icon="calendar-outline" text={`Member since ${memberLabel}`} />
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {user?.service_type ? (
              <HeaderChip
                icon="business-outline"
                label={String(user.service_type)}
                backgroundColor="rgba(255,255,255,0.18)"
                textColor="#fff"
              />
            ) : null}
            <HeaderChip
              icon="wallet-outline"
              label={walletLabel}
              onPress={() => goHub("payments")}
              backgroundColor="rgba(0,0,0,0.28)"
              textColor="#fff"
            />
            <HeaderChip
              icon={verifyChip.icon}
              label={verifyChip.label}
              onPress={() => goHub("kyc")}
              backgroundColor={verifyChip.bg}
              textColor={verifyChip.color}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              marginTop: 14,
              backgroundColor: "rgba(0,0,0,0.16)",
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 4,
            }}
          >
            <HeaderStat icon="home-outline" value={String(activeListings)} label="Active Listings" />
            <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
            <HeaderStat icon="star-outline" value={ratingValue} label={ratingLabel} />
            <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
            <HeaderStat icon="hourglass-outline" value={String(pendingListings)} label="Pending" />
            <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
            <HeaderStat icon="chatbubble-outline" value={String(inquiriesCount)} label="Inquiries" />
          </View>
        </View>
        <Svg width="100%" height={18} viewBox="0 0 100 18" preserveAspectRatio="none">
          <Path d="M0 0 Q50 18 100 0 L100 18 L0 18 Z" fill={PAGE_BG} />
        </Svg>
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 4 }}>
          <SellerServicesHeader onViewAll={() => navigation.jumpTo("Listings")} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <SellerServiceCard icon="home-outline" label="My Listings" count={activeListings} onPress={() => navigation.jumpTo("Listings")} />
            <SellerServiceCard
              icon="chatbubbles-outline"
              label="Inquiries"
              count={inquiriesCount}
              onPress={() => navigation.jumpTo("Inquiries")}
            />
            <SellerServiceCard
              icon="calendar-outline"
              label="Bookings"
              count={bookingsCount}
              onPress={() => goHub("bookings")}
              iconColor="#2563EB"
              iconBg="#DBEAFE"
            />
            <SellerServiceCard
              icon="star-outline"
              label="Reviews"
              count={sellerRating.count}
              onPress={() => goHub("reviews")}
              iconColor="#F59E0B"
              iconBg="#FEF3C7"
            />
          </View>
        </View>

        <AccountStatusCard />
        <StaffWarningCard />
        <ListingAdminNotesCard listings={myListings} />
        {pending ? (
          <View style={{ backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 14, marginTop: 14 }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Verification pending</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>Admin is reviewing your details. You cannot post yet.</Text>
          </View>
        ) : null}
        {rejected ? (
          <View style={{ backgroundColor: colors.redSoft, borderRadius: 16, padding: 14, marginTop: 14 }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Application rejected</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>{user?.rejection_note?.trim() || "Update your KYC and resubmit."}</Text>
          </View>
        ) : null}

        <AccountSection title="My Account">
          <AccountMenuRow icon="gift-outline" label="Invite & Earn" onPress={() => goHub("invite")} />
          <AccountMenuRow icon="wallet-outline" label="My Wallet" onPress={() => goHub("payments")} />
          <AccountMenuRow icon="stats-chart-outline" label="Earnings" onPress={() => goHub("earnings")} />
          <AccountMenuRow icon="bookmark-outline" label="Saved listings" onPress={() => goHub("saved")} last />
        </AccountSection>

        <AccountSection title="Seller tools">
          <AccountMenuRow
            icon="add-circle-outline"
            label="Add new listing"
            onPress={() => {
              if (isAccountRestricted(user) || !verified) {
                Alert.alert("Posting", verified ? "Your account is restricted." : "Wait until you are verified to post.");
                return;
              }
              navigation.jumpTo("Post");
            }}
          />
          <AccountMenuRow icon="chatbubbles-outline" label="Inquiries" onPress={() => navigation.jumpTo("Inquiries")} />
          <AccountMenuRow icon="megaphone-outline" label="Promotions" onPress={() => goHub("promotions")} />
          <AccountMenuRow icon="briefcase-outline" label="My services" onPress={() => goHub("services")} />
          <AccountMenuRow
            icon="id-card-outline"
            label="My ID card"
            onPress={() => {
              if (isAccountRestricted(user)) {
                Alert.alert("Account restricted", "You cannot open your ID card right now.");
                return;
              }
              openProviderIdCard(navigation);
            }}
            last
          />
        </AccountSection>

        <AccountSection title="Activity">
          <AccountMenuRow icon="star-outline" label="Reviews" onPress={() => goHub("reviews")} />
          <AccountMenuRow icon="notifications-outline" label="Notifications" onPress={() => goHub("notifications")} />
          <AccountMenuRow icon="chatbubble-ellipses-outline" label="Messages" onPress={() => openChatInbox(navigation)} last />
        </AccountSection>

        <AccountSection title="Preferences">
          <AccountMenuRow icon="settings-outline" label="Settings" onPress={() => goHub("settings")} />
          <AccountMenuRow icon="shield-checkmark-outline" label="Verification & KYC" onPress={() => goHub("kyc")} />
          <AccountMenuRow
            icon="moon-outline"
            label="Dark Theme"
            trailing={
              <Switch
                value={darkTheme}
                onValueChange={(on) => {
                  setDarkTheme(on);
                  if (on) Alert.alert("Dark theme", "Dark theme is not available yet.");
                }}
                trackColor={{ false: "#D1D5DB", true: colors.greenMint }}
                thumbColor={darkTheme ? GREEN : "#f4f3f4"}
              />
            }
            last
          />
        </AccountSection>

        <AccountSection title="More">
          <AccountMenuRow icon="headset-outline" label="Help & Support" onPress={() => goHub("help")} />
          <AccountMenuRow icon="shield-outline" label="Safety tips" onPress={() => openLegal("Safety Tips")} />
          <AccountMenuRow icon="help-circle-outline" label="FAQs" onPress={() => openLegal("FAQ")} />
          <AccountMenuRow
            icon="share-social-outline"
            label="Share this app"
            onPress={() => void Share.share({ message: "Find nearby listings on NAJIK — https://najik.com" })}
          />
          <AccountMenuRow icon="document-text-outline" label="Privacy policy" onPress={() => openLegal("Privacy Policy")} last />
        </AccountSection>

        <View style={{ marginHorizontal: -16 }}>
          <DataPrivacyActions />
        </View>
      </ScrollView>
    </View>
  );
}
