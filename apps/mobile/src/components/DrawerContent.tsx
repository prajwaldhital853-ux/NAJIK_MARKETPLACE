import { Ionicons } from "@expo/vector-icons";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider } from "../demo";
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
  tab: string;
  badge?: number;
  tag?: string;
};

const sellerMenu: Item[] = [
  { icon: "home", title: "Home", tab: "Home" },
  { icon: "business-outline", title: "My Listings", tab: "Listings" },
  { icon: "chatbubble-outline", title: "Inquiries", tab: "Inquiries", badge: 12 },
  { icon: "calendar-outline", title: "Bookings", tab: "Profile" },
  { icon: "star-outline", title: "Reviews", tab: "Profile" },
  { icon: "card-outline", title: "Earnings", tab: "Profile" },
  { icon: "megaphone-outline", title: "Promotions", tab: "Post", tag: "New" },
  { icon: "briefcase-outline", title: "Services", tab: "Listings" },
  { icon: "bookmark-outline", title: "Saved Listings", tab: "Listings" },
  { icon: "shield-checkmark-outline", title: "Verification & KYC", tab: "Profile" },
  { icon: "notifications-outline", title: "Notification", tab: "Home", badge: 5 },
  { icon: "mail-outline", title: "Messages", tab: "Inquiries" },
  { icon: "settings-outline", title: "Settings", tab: "Profile" },
  { icon: "headset-outline", title: "Help & Support", tab: "Profile" },
  { icon: "gift-outline", title: "Invite & Earn", tab: "Profile" },
];

type BuyerItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  tab: string;
  color: string;
  bg: string;
  badge?: number;
  danger?: boolean;
};

const buyerPrimary: BuyerItem[] = [
  { icon: "home", title: "Home", sub: "Browse nearby", tab: "Home", color: "#1B7D2C", bg: "#E4F6EA" },
  { icon: "home", title: "Property", sub: "Buy, Sell, Rent", tab: "Explore", color: "#1B7D2C", bg: "#E4F6EA" },
  { icon: "car", title: "Vehicles", sub: "Cars, Bikes and more", tab: "Explore", color: "#2563EB", bg: "#E8F1FE" },
  { icon: "briefcase", title: "Jobs", sub: "Find jobs near you", tab: "Explore", color: "#EA580C", bg: "#FFF1E0" },
  { icon: "construct", title: "Services", sub: "All services", tab: "Explore", color: "#7C3AED", bg: "#F1E9FF" },
  { icon: "storefront", title: "Shops", sub: "Local shops", tab: "Explore", color: "#E53935", bg: "#FDECEC" },
  { icon: "phone-portrait", title: "Electronics", sub: "Mobiles, Gadgets", tab: "Explore", color: "#2563EB", bg: "#E8F1FE" },
  { icon: "bed", title: "Used Items", sub: "Buy and Sell", tab: "Explore", color: "#16A34A", bg: "#E7F6EC" },
  { icon: "grid", title: "Others", sub: "More categories", tab: "Explore", color: "#7C3AED", bg: "#F1E9FF" },
];

const buyerSecondary: BuyerItem[] = [
  { icon: "bookmark-outline", title: "My Posts", tab: "Post", color: "#4B5563", bg: "transparent" },
  { icon: "heart-outline", title: "Saved", tab: "Saved", color: "#4B5563", bg: "transparent" },
  { icon: "notifications-outline", title: "Notifications", tab: "Home", color: "#4B5563", bg: "transparent", badge: 3 },
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
  const photo = user?.photo_uri || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80";
  const menu = sellerMenu;

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

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ backgroundColor: HEADER_GREEN, paddingTop: insets.top + k(6), paddingHorizontal: k(12), paddingBottom: k(14) }}>
        <Pressable onPress={() => navigation.closeDrawer()} style={{ alignSelf: "flex-end", padding: k(3) }} hitSlop={10}>
          <Ionicons name="close" size={k(14)} color="#fff" />
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: k(2) }}>
          <Image
            source={{ uri: photo }}
            style={{ width: k(44), height: k(44), borderRadius: k(22), borderWidth: k(2), borderColor: "#fff" }}
          />
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
            {verified ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: k(3), marginTop: k(3) }}>
                <Ionicons name="star" size={k(9)} color="#F5C518" />
                <Text style={{ color: "#fff", fontSize: k(8.5), fontWeight: "700" }}>4.9 (128 reviews)</Text>
              </View>
            ) : null}
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
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: k(8), paddingBottom: k(16) }} showsVerticalScrollIndicator={false}>
        {menu.map((item, index) => {
          const active = index === 0;
          return (
            <PressScale
              key={item.title}
              onPress={() => goTab(item.tab)}
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
  const name = user?.full_name || "Sunil K. Sah";
  const phone = user?.phone ? `+977 ${user.phone}` : "+977 9812345678";
  const email = user?.email || "sunilksah@example.com";
  const photo = user?.photo_uri || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80";

  function goTab(tab: string) {
    navigation.navigate("Tabs", { screen: tab } as never);
    navigation.closeDrawer();
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ height: insets.top + 108, overflow: "hidden", backgroundColor: "#fff" }}>
        <Svg
          width="100%"
          height={108}
          viewBox="0 0 340 108"
          preserveAspectRatio="xMidYMax slice"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
          <Path d="M0 108 L0 70 L36 46 L68 62 L108 26 L148 54 L188 18 L228 50 L264 30 L304 58 L340 36 L340 108 Z" fill="#E8F2F8" />
          <Path d="M0 108 L0 80 L48 56 L86 72 L128 40 L172 66 L214 36 L258 68 L300 50 L340 60 L340 108 Z" fill="#D5E6F2" />
          <Path d="M0 108 L0 90 L54 76 L96 88 L150 64 L196 84 L248 70 L298 86 L340 76 L340 108 Z" fill="#C5DCEC" />
        </Svg>
        <View style={{ paddingTop: insets.top + 10, alignItems: "center" }}>
          <NajikLogo size="sm" showTagline={false} layout="row" />
        </View>
      </View>

      <Pressable
        onPress={() => goTab("Profile")}
        style={{
          marginHorizontal: 14,
          marginTop: 4,
          marginBottom: 10,
          backgroundColor: "#fff",
          borderRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#EEF0F2",
          ...shadow.card,
        }}
      >
        <Image
          source={{ uri: photo }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#E8EEF0",
            borderWidth: 2.5,
            borderColor: "#22A34A",
          }}
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontWeight: "800", fontSize: 17, color: "#111827" }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 3 }} numberOfLines={1}>
            {phone}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C4C7CC" />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingTop: 2, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {buyerPrimary.map((item, index) => {
          const active = index === 0;
          return (
            <Pressable
              key={item.title}
              onPress={() => goTab(item.tab)}
              style={{
                marginHorizontal: 12,
                borderRadius: 14,
                backgroundColor: active ? "#E7F6EC" : "transparent",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: active ? "transparent" : item.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: "800", fontSize: 15, color: active ? "#068A22" : "#111827" }}>{item.title}</Text>
                  {!active && item.sub ? <Text style={{ color: "#8A8F98", fontSize: 12, marginTop: 1 }}>{item.sub}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={active ? "#068A22" : "#C4C7CC" } />
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 1, backgroundColor: "#EFF1F2", marginHorizontal: 16, marginVertical: 8 }} />

        {buyerSecondary.map((item) => (
          <PressScale
            key={item.title}
            onPress={async () => {
              if (item.danger) {
                navigation.closeDrawer();
                await logout();
                return;
              }
              goTab(item.tab);
            }}
            style={{ marginHorizontal: 12, borderRadius: 12 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 10 }}>
              <View style={{ width: 34, alignItems: "center" }}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, fontWeight: "600", color: item.danger ? "#E53935" : "#242326" }}>
                {item.title}
              </Text>
              {item.badge ? (
                <View
                  style={{
                    backgroundColor: "#E93B3B",
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 5,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{item.badge}</Text>
                </View>
              ) : null}
              {item.danger ? null : <Ionicons name="chevron-forward" size={16} color="#C4C7CC" />}
            </View>
          </PressScale>
        ))}

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: "#F3F4F6",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontWeight: "800", color: "#0C110E", fontSize: 14 }}>Post Your Ad for Free</Text>
            <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 3, lineHeight: 15 }}>
              Reach thousands of people in your area.
            </Text>
            <PressScale
              onPress={() => goTab("Post")}
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                backgroundColor: "#018821",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Post Now</Text>
            </PressScale>
          </View>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "#DCEAF4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="megaphone" size={26} color="#2563EB" />
          </View>
        </View>

        <Text style={{ textAlign: "center", color: "#9AA0A6", fontSize: 11, marginTop: 16 }}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}
