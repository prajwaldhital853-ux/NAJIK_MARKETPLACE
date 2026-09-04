import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
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
  openBuyerTransactions,
  openChatInbox,
  openMapSearch,
} from "../navigation/browse";
import { choosePhoto } from "../pickPhoto";
import { colors } from "../theme";
import Svg, { Path } from "react-native-svg";
import {
  ACCOUNT_GREEN as GREEN,
  ACCOUNT_PAGE_BG as PAGE_BG,
  AccountMenuRow as MenuRow,
  AccountQuickAction as QuickAction,
  AccountQuickDivider,
  AccountQuickRow,
  AccountSection as Section,
} from "../components/AccountProfileParts";

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
  const [darkTheme, setDarkTheme] = useState(false);

  const refreshControl = useAppRefreshControl();

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
              onCamera={pickPhoto}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }} numberOfLines={1}>
                {name}
              </Text>
              {email ? (
                <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                  {email}
                </Text>
              ) : (
                <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                  {user?.phone || "Add your email"}
                </Text>
              )}
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
          <QuickAction
            icon="bookmark-outline"
            label="Saved"
            onPress={() => navigation.jumpTo("Saved")}
          />
          <AccountQuickDivider />
          <QuickAction icon="calendar-outline" label="Bookings" onPress={() => openBookings(navigation)} />
          <AccountQuickDivider />
          <QuickAction
            icon="map-outline"
            label="Map search"
            onPress={() => openMapSearch(navigation)}
          />
        </AccountQuickRow>

        <AccountStatusCard />
        <StaffWarningCard />

        <Section title="My Account">
          <MenuRow icon="gift-outline" label="Invite & Earn" onPress={() => openBuyerInviteEarn(navigation)} />
          <MenuRow icon="bookmark-outline" label="Saved listings" onPress={() => navigation.jumpTo("Saved")} />
          <MenuRow icon="eye-outline" label="Recently viewed" onPress={() => openBuyerRecentViews(navigation)} />
          <MenuRow icon="notifications-outline" label="Notifications" onPress={() => openChatInbox(navigation)} last />
        </Section>

        <Section title="Orders & Delivery">
          <MenuRow icon="cube-outline" label="My bookings" onPress={() => openBookings(navigation)} />
          <MenuRow icon="chatbubble-ellipses-outline" label="Chats" onPress={() => navigation.jumpTo("Messages")} />
          <MenuRow icon="location-outline" label="Saved addresses" onPress={() => openMapSearch(navigation)} last />
        </Section>

        <Section title="Activity">
          <MenuRow icon="star-outline" label="My reviews" onPress={() => openBuyerReviewsGiven(navigation)} />
          <MenuRow icon="receipt-outline" label="Transaction history" onPress={() => openBuyerTransactions(navigation)} last />
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
          <MenuRow icon="shield-outline" label="Safety tips" onPress={() => openLegal("Safety Tips")} />
          <MenuRow icon="document-text-outline" label="Terms of use" onPress={() => openLegal("Terms of Use")} />
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
