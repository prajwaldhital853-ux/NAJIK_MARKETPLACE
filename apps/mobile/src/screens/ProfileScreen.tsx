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
  AccountQuickAction,
  AccountQuickDivider,
  AccountQuickRow,
  AccountSection,
} from "../components/AccountProfileParts";
import { Avatar } from "../components/Avatar";
import { DataPrivacyActions } from "../components/DataPrivacyActions";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { SellerProfileEditModal } from "../components/SellerProfileEditModal";
import { AccountStatusCard, ListingAdminNotesCard, StaffWarningCard } from "../components/StaffWarningBanner";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider, isAccountRestricted } from "../demo";
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

  const verifyLabel = verified ? "Verified seller" : pending ? "Verification pending" : rejected ? "Resubmit KYC" : "Get Verification Badge";

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
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginBottom: 14 }}>
            <PressScale onPress={confirmLogout} hitSlop={10}>
              <Ionicons name="power" size={22} color="#fff" />
            </PressScale>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }} numberOfLines={1}>
                  {name}
                </Text>
                {email ? (
                  <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                    {email}
                  </Text>
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                    {user?.phone || "Add contact"}
                  </Text>
                )}
                {user?.service_type ? (
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {String(user.service_type)}
                  </Text>
                ) : null}
              </PressScale>
              <PressScale
                onPress={() => goHub("payments")}
                style={{
                  marginTop: 10,
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(0,0,0,0.28)",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="wallet-outline" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{walletLabel}</Text>
              </PressScale>
              <PressScale
                onPress={() => goHub("kyc")}
                style={{
                  marginTop: 8,
                  alignSelf: "flex-start",
                  borderWidth: 1.5,
                  borderColor: "#fff",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{verifyLabel}</Text>
              </PressScale>
            </View>
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
        <AccountQuickRow>
          <AccountQuickAction icon="home-outline" label="My listings" onPress={() => navigation.jumpTo("Listings")} />
          <AccountQuickDivider />
          <AccountQuickAction icon="calendar-outline" label="Bookings" onPress={() => goHub("bookings")} />
          <AccountQuickDivider />
          <AccountQuickAction icon="wallet-outline" label="Wallet" onPress={() => goHub("payments")} />
        </AccountQuickRow>

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
