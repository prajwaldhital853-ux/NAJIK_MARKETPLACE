import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Dimensions, Image, ScrollView, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { PressScale } from "../components/PressScale";
import { SellerHeroBanner } from "../components/SellerHeroBanner";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider } from "../demo";
import { openSellerPage } from "../navigation/browse";
import { colors, shadow } from "../theme";

const skyline = require("../../assets/login-skyline.png");
const GAP = 8;
const PAD = 16;
const CARD_W = (Dimensions.get("window").width - PAD * 2 - GAP * 3) / 4;
const GREEN = "#1B7D2C";

const stats = [
  { icon: "home-outline", value: "42", label: "Active Listings" },
  { icon: "chatbubble-outline", value: "128", label: "Total Inquiries" },
  { icon: "star-outline", value: "4.9", label: "Rating" },
  { icon: "eye-outline", value: "2.5K", label: "Profile Views" },
];

const services: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  count: string;
  badge?: number;
  tab?: string;
  page?: "bookings" | "reviews";
}[] = [
  { icon: "home", color: "#1B7D2C", bg: "#E4F6EA", title: "My Listings", count: "42", tab: "Listings" },
  { icon: "chatbubbles", color: "#1B7D2C", bg: "#E4F6EA", title: "Inquiries", count: "128", badge: 12, tab: "Inquiries" },
  { icon: "calendar", color: "#2563EB", bg: "#E8F1FE", title: "Bookings", count: "18", page: "bookings" },
  { icon: "star", color: "#EA580C", bg: "#FFF1E0", title: "Reviews", count: "24", page: "reviews" },
];

const actions: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  badge?: number;
  tab?: string;
  page?: "promotions" | "services" | "earnings" | "messages" | "kyc" | "settings";
}[] = [
  { icon: "add", color: "#fff", bg: "#1B7D2C", title: "Add New Listing", tab: "Post" },
  { icon: "settings", color: "#7C3AED", bg: "#F1E9FF", title: "Manage Services", page: "services" },
  { icon: "megaphone", color: "#EA580C", bg: "#FFF1E0", title: "Promote Listing", page: "promotions" },
  { icon: "stats-chart", color: "#1B7D2C", bg: "#E4F6EA", title: "Earnings Report", page: "earnings" },
  { icon: "chatbubble-ellipses", color: "#2563EB", bg: "#E8F1FE", title: "Inbox", badge: 8, page: "messages" },
  { icon: "wallet", color: "#7C3AED", bg: "#F1E9FF", title: "Wallet", page: "earnings" },
  { icon: "shield-checkmark", color: "#1B7D2C", bg: "#E4F6EA", title: "Verification & KYC", page: "kyc" },
  { icon: "settings-outline", color: "#64748B", bg: "#EEF2F6", title: "Settings", page: "settings" },
];

export function ProfileScreen() {
  const { user, logout, refreshVerification } = useAuth();
  const navigation = useNavigation<any>();
  const name = user?.full_name || "Sunil K. Sah";
  const pending = isPendingProvider(user);
  const verified = isVerifiedProvider(user);
  const rejected = isRejectedProvider(user);
  const photo = user?.photo_uri || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80";

  if (!isProvider(user)) {
    return <BuyerProfile />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell" showLocation bellCount={5} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {pending ? (
          <View style={{ backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Verification pending</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>Admin is reviewing your nagrita, photo and details. You cannot post yet.</Text>
            <PressScale onPress={() => void refreshVerification()} style={{ marginTop: 10, alignSelf: "flex-start" }}>
              <Text style={{ color: colors.green, fontWeight: "800" }}>Check status</Text>
            </PressScale>
          </View>
        ) : null}
        {rejected ? (
          <View style={{ backgroundColor: colors.redSoft, borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Application rejected</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>You cannot post services until a new application is approved.</Text>
          </View>
        ) : null}

        <SellerHeroBanner
          name={name}
          photo={photo}
          serviceType={user?.service_type}
          verified={verified}
          pending={pending}
          rejected={rejected}
          variant="profile"
        />

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
                {item.badge ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      backgroundColor: "#E53935",
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 3,
                      borderWidth: 1.5,
                      borderColor: "#fff",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{item.badge}</Text>
                  </View>
                ) : null}
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
                {item.badge ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      backgroundColor: "#E53935",
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 3,
                      borderWidth: 1.5,
                      borderColor: "#fff",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{item.badge}</Text>
                  </View>
                ) : null}
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
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const name = user?.full_name || "Sunil K. Sah";
  const phone = user?.phone ? (user.phone.startsWith("+") ? user.phone : `+977 ${user.phone}`) : "+977 9812345678";
  const email = user?.email || "sunilk.sah@example.com";
  const photo = user?.photo_uri || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80";
  const location = "Lahan, Siraha";

  const stats = [
    { icon: "heart" as const, color: GREEN, bg: "#E7F6EC", value: "12", label: "Saved Items", tab: "Saved" },
    { icon: "chatbubble-ellipses" as const, color: "#7C3AED", bg: "#F1E9FF", value: "18", label: "Inquiries", tab: "Explore" },
    { icon: "time" as const, color: "#2563EB", bg: "#E8F1FE", value: "6", label: "Recently Viewed", tab: "Explore" },
    { icon: "star" as const, color: "#EA580C", bg: "#FFF1E0", value: "24", label: "Reviews Given", tab: "Explore" },
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
    { icon: "calendar-outline" as const, label: "Member Since", value: "Jan 2024" },
  ];

  const more = [
    { icon: "notifications" as const, color: GREEN, bg: "#E7F6EC", title: "Notifications" },
    { icon: "shield-checkmark" as const, color: "#2563EB", bg: "#E8F1FE", title: "Security" },
    { icon: "headset" as const, color: "#EA580C", bg: "#FFF1E0", title: "Help & Support" },
    { icon: "settings" as const, color: "#7C3AED", bg: "#F1E9FF", title: "Settings" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell-settings" showLocation showPro={false} bellCount={3} pinColor={GREEN} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
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
            <View>
              <Image
                source={{ uri: photo }}
                style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: GREEN, backgroundColor: "#E8EEF0" }}
              />
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: GREEN,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              >
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </View>
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
