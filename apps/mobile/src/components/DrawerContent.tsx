import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { fetchSellerEarningsSummary } from "../earningsApi";
import { emitWalletChanged, subscribeWalletChanged } from "../walletRefresh";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useDrawerStatus } from "@react-navigation/drawer";
import { Pressable, ScrollView, Text, View, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import type { CatalogKey } from "../data/catalog";
import type { SellerPage } from "../data/sellerHub";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider } from "../demo";
import { openBookings, openCategory, openMapSearch, openSellerPage } from "../navigation/browse";
import { Avatar } from "./Avatar";
import { NajikLogo } from "./NajikLogo";
import { PressScale } from "./PressScale";
import { shadow } from "../theme";

/**
 * Sizes come from the NAJIK drawer mock (204pt panel) scaled to the 296pt panel the app uses.
 * Fixed on purpose: scaling with the window width blew the rows up on wide screens.
 */

const k = (v: number) => Math.round(v * 1.45);

const HEADER_GREEN = "#014E2E";
const ACTIVE_BG = "#EDF7F1";
const ACTIVE_GREEN = "#068A22";
const TITLE = "#242326";
const CHEVRON = "#9A9BA2";
const BADGE_RED = "#E93B3B";
const PROMO_BG = "#EEF7F2";
const PROMO_GREEN = "#018821";

type Item = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  tab?: string;
  page?: SellerPage;
  badge?: number;
  tag?: string;
};

const sellerMenu: Item[] = [
  { icon: "home", title: "Home", tab: "Home" },
  { icon: "business-outline", title: "My Listings", tab: "Listings" },
  { icon: "chatbubble-outline", title: "Inquiries", tab: "Inquiries" },
  { icon: "calendar-outline", title: "Bookings", page: "bookings" },
  { icon: "star-outline", title: "Reviews", page: "reviews" },
  { icon: "card-outline", title: "Earnings", page: "earnings" },
  { icon: "megaphone-outline", title: "Promotions", page: "promotions", tag: "New" },
  { icon: "briefcase-outline", title: "Services", page: "services" },
  { icon: "bookmark-outline", title: "Saved Listings", page: "saved" },
  { icon: "shield-checkmark-outline", title: "Verification & KYC", page: "kyc" },
  { icon: "notifications-outline", title: "Notification", page: "notifications" },
  { icon: "settings-outline", title: "Settings", page: "settings" },
  { icon: "headset-outline", title: "Help & Support", page: "help" },
  { icon: "wallet-outline", title: "Payments", page: "payments" },
  { icon: "gift-outline", title: "Invite & Earn", page: "invite" },
];

type BuyerItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  tab: string;
  catalog?: CatalogKey;
  color: string;
  bg: string;
  badge?: number;
  danger?: boolean;
};

const buyerPrimary: BuyerItem[] = [
  { icon: "home", title: "Home", sub: "Browse nearby", tab: "Home", color: "#1B7D2C", bg: "#E4F6EA" },
  { icon: "calendar-outline", title: "Bookings", sub: "Request a visit", tab: "Bookings", color: "#1B7D2C", bg: "#E4F6EA" },
  { icon: "map", title: "Map Search", sub: "Nearby listings on the map", tab: "MapSearch", color: "#1B7D2C", bg: "#E4F6EA" },
  { icon: "home", title: "Property", sub: "Buy, Sell, Rent", tab: "Explore", catalog: "property", color: "#1B7D2C", bg: "#E4F6EA" },
  { icon: "car", title: "Vehicles", sub: "Cars, Bikes and more", tab: "Explore", catalog: "vehicles", color: "#2563EB", bg: "#E8F1FE" },
  { icon: "briefcase", title: "Jobs", sub: "Find jobs near you", tab: "Explore", catalog: "jobs", color: "#EA580C", bg: "#FFF1E0" },
  { icon: "construct", title: "Services", sub: "All services", tab: "Explore", catalog: "services", color: "#7C3AED", bg: "#F1E9FF" },
  { icon: "storefront", title: "Shops", sub: "Local shops", tab: "Explore", catalog: "shops", color: "#E53935", bg: "#FDECEC" },
  { icon: "phone-portrait", title: "Electronics", sub: "Mobiles, Gadgets", tab: "Explore", catalog: "electronics", color: "#2563EB", bg: "#E8F1FE" },
  { icon: "bed", title: "Used Items", sub: "Buy and Sell", tab: "Explore", catalog: "used", color: "#16A34A", bg: "#E7F6EC" },
  { icon: "grid", title: "Others", sub: "More categories", tab: "Explore", catalog: "others", color: "#7C3AED", bg: "#F1E9FF" },
];

const buyerSecondary: BuyerItem[] = [
  { icon: "heart-outline", title: "Saved", tab: "Saved", color: "#4B5563", bg: "transparent" },
  { icon: "search-outline", title: "Explore", tab: "Explore", color: "#4B5563", bg: "transparent" },
  { icon: "notifications-outline", title: "Notifications", tab: "Home", color: "#4B5563", bg: "transparent" },
  { icon: "settings-outline", title: "Settings", tab: "Profile", color: "#4B5563", bg: "transparent" },
  { icon: "help-circle-outline", title: "Help & Support", tab: "Profile", color: "#4B5563", bg: "transparent" },
  { icon: "power-outline", title: "Logout", tab: "Logout", color: "#E53935", bg: "transparent", danger: true },
];

export function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const name = user?.full_name || "NAJIK user";
  const provider = isProvider(user);
  const pending = isPendingProvider(user);
  const verified = isVerifiedProvider(user);
  const rejected = isRejectedProvider(user);
  const photo = user?.photo_uri || "";
  const menu = sellerMenu;
  const [balances, setBalances] = useState<Awaited<ReturnType<typeof fetchSellerEarningsSummary>> | null>(null);
  const drawerStatus = useDrawerStatus();

  useEffect(() => {
    if (!provider) return;
    const loadBalances = () => {
      void fetchSellerEarningsSummary()
        .then(setBalances)
        .catch(() => setBalances(null));
    };
    if (drawerStatus === "open") loadBalances();
    return subscribeWalletChanged(loadBalances);
  }, [provider, drawerStatus]);

  if (!provider) {
    return <BuyerDrawer navigation={navigation} />;
  }

  const role = provider
    ? verified
      ? "Verified Service Provider"
      : pending
        ? "Verification pending"
        : rejected
          ? "Application rejected"
          : "Service Provider"
    : "NAJIK User";

  function goTab(tab: string) {
    navigation.navigate("Tabs", { screen: tab } as never);
    navigation.closeDrawer();
  }

  function goItem(item: Item) {
    if (item.tab === "ChatInbox") {
      navigation.navigate("ChatInbox");
      navigation.closeDrawer();
      return;
    }
    if (item.page) {
      openSellerPage(navigation, item.page);
      navigation.closeDrawer();
      return;
    }
    if (item.tab) goTab(item.tab);
  }

  const drawer = navigation.getState();
  const current = drawer.routes[drawer.index];
  const hubPage = current.name === "SellerHub" ? (current.params as { page?: SellerPage } | undefined)?.page : undefined;
  const onTabs = current.name === "Tabs";
  const tabState = current.state as { index?: number; routes?: { name: string }[] } | undefined;
  const tabName = onTabs && tabState?.routes && typeof tabState.index === "number" ? tabState.routes[tabState.index]?.name : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ backgroundColor: HEADER_GREEN, paddingTop: insets.top + k(6), paddingHorizontal: k(12), paddingBottom: k(14) }}>
        <Pressable onPress={() => navigation.closeDrawer()} style={{ alignSelf: "flex-end", padding: k(3) }} hitSlop={10}>
          <Ionicons name="close" size={k(14)} color="#fff" />
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: k(2) }}>
          <Avatar name={name} uri={photo || undefined} size={k(44)} />
          <View style={{ flex: 1, marginLeft: k(10) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: k(4) }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: k(12) }} numberOfLines={1}>
                {name}
              </Text>
              {verified ? <Ionicons name="checkmark-circle" size={k(10)} color="#2ED573" /> : null}
            </View>
            <Text style={{ color: "#CFE9DA", fontSize: k(8.5), marginTop: k(2) }} numberOfLines={1}>
              {role}
            </Text>
          </View>
        </View>

        <PressScale
          onPress={() => goTab("Profile")}
          style={{
            marginTop: k(10),
            marginLeft: k(54),
            alignSelf: "flex-start",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.85)",
            paddingHorizontal: k(12),
            paddingVertical: k(5),
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: k(4),
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: k(9) }}>View Profile</Text>
          <Ionicons name="chevron-forward" size={k(9)} color="#fff" />
        </PressScale>

        {balances ? (
          <View
            style={{
              marginTop: k(10),
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: k(10),
              padding: k(10),
            }}
          >
            <Text style={{ color: "#E8F8EE", fontSize: k(8), fontWeight: "700" }}>Your balances</Text>
            <View style={{ flexDirection: "row", marginTop: k(6), gap: k(6) }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#CFE9DA", fontSize: k(7.5) }}>Loaded</Text>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: k(10), marginTop: 2 }}>{balances.loaded_balance_label}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#CFE9DA", fontSize: k(7.5) }}>Refer & Earn</Text>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: k(10), marginTop: 2 }}>{balances.referrer_balance_label}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#CFE9DA", fontSize: k(7.5) }}>Combined</Text>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: k(10), marginTop: 2 }}>{balances.combined_balance_label}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: k(8), paddingBottom: k(16) }} showsVerticalScrollIndicator={false}>
        {menu.map((item) => {
          const active = item.page ? item.page === hubPage : Boolean(item.tab && item.tab === (tabName ?? "Home") && onTabs);
          return (
            <PressScale
              key={item.title}
              onPress={() => goItem(item)}
              style={{
                marginHorizontal: k(12),
                borderRadius: k(9),
                backgroundColor: active ? ACTIVE_BG : "transparent",
              }}
            >
              <View
                style={{
                  minHeight: k(26),
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: k(4),
                  paddingVertical: k(4),
                }}
              >
                {active ? (
                  <View
                    style={{
                      width: k(18),
                      height: k(18),
                      borderRadius: k(6),
                      backgroundColor: "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={item.icon} size={k(11)} color={ACTIVE_GREEN} />
                  </View>
                ) : (
                  <View style={{ width: k(18), alignItems: "center" }}>
                    <Ionicons name={item.icon} size={k(13)} color="#3C3C43" />
                  </View>
                )}

                <Text
                  style={{
                    flex: 1,
                    marginLeft: k(12),
                    fontSize: k(10),
                    fontWeight: active ? "700" : "500",
                    color: active ? ACTIVE_GREEN : TITLE,
                  }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                {item.tag ? (
                  <View
                    style={{
                      backgroundColor: "#CFEED7",
                      paddingHorizontal: k(6),
                      paddingVertical: k(1.5),
                      borderRadius: 999,
                      marginRight: k(6),
                    }}
                  >
                    <Text style={{ color: "#0B7A26", fontSize: k(7), fontWeight: "800" }}>{item.tag}</Text>
                  </View>
                ) : null}

                {item.badge ? (
                  <View
                    style={{
                      backgroundColor: BADGE_RED,
                      minWidth: k(15),
                      height: k(15),
                      borderRadius: k(7.5),
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: k(4),
                      marginRight: k(6),
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: k(7.5), fontWeight: "800" }}>{item.badge}</Text>
                  </View>
                ) : null}

                {active ? null : <Ionicons name="chevron-forward" size={k(9)} color={CHEVRON} />}
              </View>
            </PressScale>
          );
        })}

        <View style={{ height: 1, backgroundColor: "#EFF1F2", marginHorizontal: k(12), marginVertical: k(6) }} />

        <PressScale
          onPress={async () => {
            navigation.closeDrawer();
            await logout();
          }}
          style={{ marginHorizontal: k(12) }}
        >
          <View style={{ minHeight: k(26), flexDirection: "row", alignItems: "center", paddingHorizontal: k(4) }}>
            <View style={{ width: k(18), alignItems: "center" }}>
              <Ionicons name="log-out-outline" size={k(13)} color="#3C3C43" />
            </View>
            <Text style={{ marginLeft: k(12), fontSize: k(10), fontWeight: "500", color: TITLE }}>Logout</Text>
          </View>
        </PressScale>

        <View
          style={{
            marginHorizontal: k(12),
            marginTop: k(12),
            backgroundColor: PROMO_BG,
            borderRadius: k(10),
            padding: k(12),
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, paddingRight: k(6) }}>
              <Text style={{ fontWeight: "800", color: "#0C110E", fontSize: k(11) }}>
                {provider ? "Grow Your Business" : "Post Your Ad for Free"}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: k(8), marginTop: k(3), lineHeight: k(11) }}>
                {provider ? "Promote your listings and reach more customers." : "Reach thousands of people in your area."}
              </Text>
              <PressScale
                onPress={() => goTab("Post")}
                style={{
                  marginTop: k(10),
                  alignSelf: "flex-start",
                  backgroundColor: PROMO_GREEN,
                  paddingHorizontal: k(11),
                  paddingVertical: k(6),
                  borderRadius: k(7),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: k(4),
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: k(9) }}>
                  {provider ? "Promote Now" : "Post Now"}
                </Text>
                <Ionicons name="arrow-forward" size={k(9)} color="#fff" />
              </PressScale>
            </View>

            <View style={{ width: k(46), alignItems: "center", justifyContent: "center" }}>
              <View
                style={{
                  width: k(40),
                  height: k(40),
                  borderRadius: k(20),
                  backgroundColor: "#DCF0E2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="rocket" size={k(22)} color="#1B9E4B" style={{ transform: [{ rotate: "-20deg" }] }} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function BuyerDrawer({ navigation }: { navigation: DrawerContentComponentProps["navigation"] }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const name = user?.full_name || "Account";
  const phone = user?.phone ? `+977 ${user.phone}` : "";
  const email = user?.email || "";
  const photo = user?.photo_uri || "";
  const drawer = navigation.getState();
  const current = drawer.routes[drawer.index];
  const activeCatalog = current.name === "CategoryBrowse" ? (current.params as { key?: CatalogKey } | undefined)?.key : undefined;
  const onHome = current.name === "Tabs";

  const drawerW = Math.min(Dimensions.get("window").width * 0.78, 300);
  const scale = drawerW / 300;
  const s = (v: number) => Math.round(v * scale);
  const headerH = s(72);

  function goTab(tab: string) {
    navigation.navigate("Tabs", { screen: tab } as never);
    navigation.closeDrawer();
  }

  function goCategory(key: CatalogKey) {
    openCategory(navigation, key);
    navigation.closeDrawer();
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ height: insets.top + headerH, overflow: "hidden", backgroundColor: "#fff" }}>
        <Svg
          width="100%"
          height={headerH}
          viewBox="0 0 340 72"
          preserveAspectRatio="xMidYMax slice"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
          <Path d="M0 72 L0 46 L36 30 L68 42 L108 18 L148 38 L188 12 L228 34 L264 20 L304 38 L340 24 L340 72 Z" fill="#E8F2F8" />
          <Path d="M0 72 L0 54 L48 38 L86 48 L128 28 L172 44 L214 24 L258 46 L300 34 L340 40 L340 72 Z" fill="#D5E6F2" />
          <Path d="M0 72 L0 60 L54 50 L96 58 L150 42 L196 56 L248 46 L298 58 L340 50 L340 72 Z" fill="#C5DCEC" />
        </Svg>
        <View style={{ paddingTop: insets.top + s(6), alignItems: "center" }}>
          <NajikLogo size="sm" showTagline={false} layout="row" />
        </View>
      </View>

      <Pressable
        onPress={() => goTab("Profile")}
        style={{
          marginHorizontal: s(12),
          marginTop: s(2),
          marginBottom: s(8),
          backgroundColor: "#fff",
          borderRadius: s(14),
          paddingVertical: s(8),
          paddingHorizontal: s(10),
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#EEF0F2",
          ...shadow.card,
        }}
      >
        <Avatar name={name} uri={photo || undefined} size={s(52)} borderColor="#22A34A" borderWidth={2} />
        <View style={{ flex: 1, marginLeft: s(10) }}>
          <Text style={{ fontWeight: "800", fontSize: s(14), color: "#111827" }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: s(11), marginTop: 2 }} numberOfLines={1}>
            {phone}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: s(10), marginTop: 1 }} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={s(16)} color="#C4C7CC" />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingTop: 2, paddingBottom: s(16) }} showsVerticalScrollIndicator={false}>
        {buyerPrimary.map((item) => {
          const active = item.catalog ? item.catalog === activeCatalog : item.title === "Home" && onHome && !activeCatalog;
          return (
            <Pressable
              key={item.title}
              onPress={() => {
                if (item.tab === "MapSearch") {
                  openMapSearch(navigation);
                  navigation.closeDrawer();
                  return;
                }
                if (item.tab === "Bookings") {
                  openBookings(navigation);
                  navigation.closeDrawer();
                  return;
                }
                item.catalog ? goCategory(item.catalog) : goTab(item.tab);
              }}
              style={{
                marginHorizontal: s(10),
                borderRadius: s(12),
                backgroundColor: active ? "#E7F6EC" : "transparent",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: s(10), paddingVertical: s(8) }}>
                <View
                  style={{
                    width: s(30),
                    height: s(30),
                    borderRadius: s(8),
                    backgroundColor: active ? "transparent" : item.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={item.icon} size={s(17)} color={item.color} />
                </View>
                <View style={{ flex: 1, marginLeft: s(10) }}>
                  <Text style={{ fontWeight: "800", fontSize: s(13), color: active ? "#068A22" : "#111827" }}>{item.title}</Text>
                  {!active && item.sub ? <Text style={{ color: "#8A8F98", fontSize: s(10), marginTop: 1 }}>{item.sub}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={s(15)} color={active ? "#068A22" : "#C4C7CC" } />
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 1, backgroundColor: "#EFF1F2", marginHorizontal: s(14), marginVertical: s(6) }} />

        {buyerSecondary.map((item) => (
          <PressScale
            key={item.title}
            onPress={async () => {
              if (item.danger) {
                navigation.closeDrawer();
                await logout();
                return;
              }
              if (item.tab === "ChatInbox") {
                navigation.navigate("ChatInbox");
                navigation.closeDrawer();
                return;
              }
              goTab(item.tab);
            }}
            style={{ marginHorizontal: s(10), borderRadius: s(10) }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: s(8), paddingVertical: s(8) }}>
              <View style={{ width: s(28), alignItems: "center" }}>
                <Ionicons name={item.icon} size={s(18)} color={item.color} />
              </View>
              <Text style={{ flex: 1, marginLeft: s(8), fontSize: s(12), fontWeight: "600", color: item.danger ? "#E53935" : "#242326" }}>
                {item.title}
              </Text>
              {item.badge ? (
                <View
                  style={{
                    backgroundColor: "#E93B3B",
                    minWidth: s(16),
                    height: s(16),
                    borderRadius: s(8),
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: s(4),
                    marginRight: s(6),
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: s(9), fontWeight: "800" }}>{item.badge}</Text>
                </View>
              ) : null}
              {item.danger ? null : <Ionicons name="chevron-forward" size={s(14)} color="#C4C7CC" />}
            </View>
          </PressScale>
        ))}

        <Text style={{ textAlign: "center", color: "#9AA0A6", fontSize: s(10), marginTop: s(12) }}>Version 1.0.4</Text>
      </ScrollView>
    </View>
  );
}
