import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { ComponentProps } from "react";
import { useCallback, useState, type ReactNode } from "react";
import { Alert, ScrollView, Share, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountStatusCard, StaffWarningCard } from "../components/StaffWarningBanner";
import { Avatar } from "../components/Avatar";
import { DataPrivacyActions } from "../components/DataPrivacyActions";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { infoLinkDocId } from "../legal/types";
import {
  openBookings,
  openBuyerInviteEarn,
  openBuyerRecentViews,
  openBuyerReviewsGiven,
  openChatInbox,
  openMapSearch,
} from "../navigation/browse";
import { fetchSellerPaymentsMe } from "../paymentsApi";
import { choosePhoto } from "../pickPhoto";
import { colors, shadow } from "../theme";

type Ion = ComponentProps<typeof Ionicons>["name"];

const GREEN = colors.greenDeep;
const HEADER = colors.forestDeep;
const ICON_BG = colors.greenSoft;
const PAGE_BG = "#F3F4F6";

function memberSince(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function BuyerProfile() {
  const { user, updateBuyerPhoto, logout } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const name = user?.full_name || "Account";
  const email = user?.email || "";
  const photo = user?.photo_uri || "";
  const phoneVerified = Boolean(user?.phone_verified);
  const [walletLabel, setWalletLabel] = useState("Rs. 0.00");
  const [darkTheme, setDarkTheme] = useState(false);

  const loadCounts = useCallback(() => {
    void fetchSellerPaymentsMe()
      .then((pay) => setWalletLabel(pay.balance_label || pay.refer_earn_remaining_label || "Rs. 0.00"))
      .catch(() => setWalletLabel("Rs. 0.00"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts]),
  );

  const refreshControl = useAppRefreshControl(loadCounts);

  function pickPhoto() {
    choosePhoto((uri) => {
      void updateBuyerPhoto(uri).catch((err) =>
        Alert.alert("Photo", err instanceof Error ? err.message : "Could not save photo."),
      );
    }, "Profile photo");
  }

  function openLegal(label: string) {
    const doc = infoLinkDocId(label);
    if (doc) navigation.navigate("LegalDocument", { doc, role: "buyer" });
  }

  function confirmLogout() {
    Alert.alert("Log out", "Sign out of this NAJIK account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void logout() },
    ]);
  }

  async function shareApp() {
    try {
      await Share.share({ message: "Find nearby listings on NAJIK — https://najik.com" });
    } catch {
      /* ignore */
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <View
        style={{
          backgroundColor: HEADER,
          paddingTop: insets.top + 6,
          paddingHorizontal: 16,
          paddingBottom: 36,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ flex: 1, color: "#fff", fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
            {name}
          </Text>
          <PressScale onPress={confirmLogout} hitSlop={10}>
            <Ionicons name="power" size={22} color="#fff" />
          </PressScale>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Avatar name={name} uri={photo || undefined} size={84} borderColor="#fff" borderWidth={3} onCamera={pickPhoto} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }} numberOfLines={1}>
              {name}
            </Text>
            {email ? (
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                {email}
              </Text>
            ) : (
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                {user?.phone || "Add your email"}
              </Text>
            )}
            <PressScale
              onPress={() => openBuyerInviteEarn(navigation)}
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
              onPress={() => {
                if (phoneVerified) {
                  Alert.alert("Verified", "Your buyer account is already verified.");
                  return;
                }
                openLegal("Contact Us");
              }}
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
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                {phoneVerified ? "Verified buyer" : "Get Verification Badge"}
              </Text>
            </PressScale>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, marginTop: -22 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 18,
            paddingVertical: 14,
            flexDirection: "row",
            ...shadow.card,
          }}
        >
          <QuickAction
            icon="storefront-outline"
            label="Saved ads"
            onPress={() => navigation.jumpTo("Saved")}
          />
          <View style={{ width: 1, backgroundColor: "#EEF0F3" }} />
          <QuickAction icon="bag-handle-outline" label="My bookings" onPress={() => openBookings(navigation)} />
          <View style={{ width: 1, backgroundColor: "#EEF0F3" }} />
          <QuickAction
            icon="receipt-outline"
            label="Invite rewards"
            onPress={() => openBuyerInviteEarn(navigation)}
          />
        </View>

        <AccountStatusCard />
        <StaffWarningCard />

        <Section title="My Account">
          <MenuRow icon="wallet-outline" label="My Wallet" onPress={() => openBuyerInviteEarn(navigation)} />
          <MenuRow icon="cash-outline" label="NAJIK Coins" onPress={() => openBuyerInviteEarn(navigation)} />
          <MenuRow icon="pricetag-outline" label="Invite & Earn" onPress={() => openBuyerInviteEarn(navigation)} />
          <MenuRow icon="return-down-back-outline" label="Bookings & visits" onPress={() => openBookings(navigation)} last />
        </Section>

        <Section title="Orders & Delivery">
          <MenuRow icon="cube-outline" label="My bookings" onPress={() => openBookings(navigation)} />
          <MenuRow icon="chatbubble-ellipses-outline" label="Chats" onPress={() => navigation.jumpTo("Messages")} />
          <MenuRow icon="location-outline" label="Saved addresses" onPress={() => openMapSearch(navigation)} last />
        </Section>

        <Section title="Activity">
          <MenuRow icon="eye-outline" label="Recently viewed" onPress={() => openBuyerRecentViews(navigation)} />
          <MenuRow icon="star-outline" label="My reviews" onPress={() => openBuyerReviewsGiven(navigation)} />
          <MenuRow icon="notifications-outline" label="Notifications" onPress={() => openChatInbox(navigation)} last />
        </Section>

        <Section title="Preferences">
          <MenuRow
            icon="globe-outline"
            label="Language"
            onPress={() => Alert.alert("Language", "English is the current language. More languages will be added soon.")}
          />
          <MenuRow
            icon="moon-outline"
            label="Dark Theme"
            trailing={
              <Switch
                value={darkTheme}
                onValueChange={(on) => {
                  setDarkTheme(on);
                  if (on) Alert.alert("Dark theme", "Dark theme is not available yet. We'll keep your preference for a later update.");
                }}
                trackColor={{ false: "#D1D5DB", true: colors.greenMint }}
                thumbColor={darkTheme ? GREEN : "#f4f3f4"}
              />
            }
          />
          <MenuRow
            icon="person-outline"
            label="Profile details"
            onPress={() =>
              Alert.alert(
                "Profile",
                [`Name: ${name}`, email ? `Email: ${email}` : "", user?.phone ? `Phone: ${user.phone}` : "", `Member since: ${memberSince(user?.date_joined)}`]
                  .filter(Boolean)
                  .join("\n"),
              )
            }
            last
          />
        </Section>

        <Section title="More">
          <MenuRow icon="help-circle-outline" label="FAQs" onPress={() => openLegal("FAQ")} />
          <MenuRow icon="share-social-outline" label="Share this app" onPress={() => void shareApp()} />
          <MenuRow
            icon="star-outline"
            label="Rate us"
            onPress={() => Alert.alert("Rate NAJIK", "Thanks! You can rate the app when it is live on the store.")}
          />
          <MenuRow icon="headset-outline" label="Contact us" onPress={() => openLegal("Contact Us")} />
          <MenuRow
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={() => openLegal("Privacy Policy")}
            last
          />
        </Section>

        <View style={{ marginHorizontal: -16 }}>
          <DataPrivacyActions />
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: Ion; label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: ICON_BG,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={GREEN} />
      </View>
      <Text style={{ marginTop: 8, fontWeight: "700", fontSize: 11, color: "#111827", textAlign: "center" }} numberOfLines={2}>
        {label}
      </Text>
    </PressScale>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 13, marginBottom: 10 }}>{title}</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", ...shadow.card }}>{children}</View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  trailing,
  last,
}: {
  icon: Ion;
  label: string;
  onPress?: () => void;
  trailing?: ReactNode;
  last?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: ICON_BG,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={GREEN} />
      </View>
      <Text style={{ flex: 1, marginLeft: 12, fontWeight: "600", fontSize: 15, color: "#111827" }}>{label}</Text>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color="#C4C7CC" />}
    </PressScale>
  );
}
