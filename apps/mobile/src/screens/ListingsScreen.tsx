import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { myListings } from "../data/mock";
import { canPostServices, isPendingProvider } from "../demo";
import { colors, shadow } from "../theme";
import type { Listing } from "../types";

const houseArt = require("../../assets/hero/house.png");

const listingPhotos: Record<string, number> = {
  l1: require("../../assets/listings/flat.jpg"),
  l2: require("../../assets/listings/land.jpg"),
  l3: require("../../assets/listings/shop.jpg"),
  l4: require("../../assets/listings/modern.jpg"),
};

function metaIcon(text: string): keyof typeof Ionicons.glyphMap {
  const value = text.toLowerCase();
  if (value.includes("bed")) return "bed-outline";
  if (value.includes("bath")) return "water-outline";
  if (value.includes("aana") || value.includes("ropani")) return "map-outline";
  if (value.includes("floor")) return "business-outline";
  return "resize-outline";
}

const pills = ["All Listings (42)", "Active (28)", "Pending (5)", "Sold/Rented (6)", "Expired (3)"];

const stats = [
  { icon: "home", color: "#1B7D2C", bg: "#E4F6EA", value: "42", label: "Total Listings", trend: "All time" },
  { icon: "eye", color: "#2563EB", bg: "#E8F1FE", value: "2.5K", label: "Total Views", trend: "↑ 18% vs last month", up: true },
  { icon: "chatbubble", color: "#EA580C", bg: "#FFF1E0", value: "128", label: "Total Inquiries", trend: "↑ 24% vs last month", up: true },
  { icon: "bookmark", color: "#7C3AED", bg: "#F1E9FF", value: "18", label: "Saved Listings", trend: "↑ 12% vs last month", up: true },
];

export function ListingsScreen() {
  const [pill, setPill] = useState(pills[0]);
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const pending = isPendingProvider(user);
  const canPost = canPostServices(user);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader bellCount={5} />
      <KeyboardScreen adjustKeyboardInsets={false} contentStyle={{ padding: 16, paddingTop: 8 }}>
        <View style={{ height: 86, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
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
              backgroundColor: "#1B7D2C",
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

        {canPost ? (
          <VerifiedBody pill={pill} setPill={setPill} />
        ) : (
          <View style={{ marginTop: 16, backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 16, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>{pending ? "Verification pending" : "Cannot post yet"}</Text>
            <Text style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
              You will see listings here after NAJIK admin verifies your account.
            </Text>
          </View>
        )}
      </KeyboardScreen>
    </View>
  );
}

function VerifiedBody({ pill, setPill }: { pill: string; setPill: (value: string) => void }) {
  const { onInputFocus } = useKeyboardScroll();

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 22,
            paddingHorizontal: 12,
            height: 42,
            borderWidth: 1,
            borderColor: "#E6E8EC",
          }}
        >
          <Ionicons name="search" size={16} color="#9AA0A6" />
          <TextInput
            placeholder="Search by title, location or type..."
            placeholderTextColor="#9AA0A6"
            onFocus={onInputFocus}
            style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy, paddingVertical: 0 }}
          />
        </View>
        <Tool icon="funnel-outline" label="Filter" />
        <Tool icon="swap-vertical-outline" label="Sort" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
        {pills.map((item) => {
          const on = item === pill;
          return (
            <PressScale
              key={item}
              onPress={() => setPill(item)}
              style={{
                backgroundColor: on ? "#1B7D2C" : "#fff",
                borderWidth: 1,
                borderColor: on ? "#1B7D2C" : "#E6E8EC",
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: on ? "#fff" : "#4B5563", fontWeight: "700", fontSize: 11 }}>{item}</Text>
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
            <Text style={{ color: item.up ? "#1B7D2C" : "#9AA0A6", fontSize: 7.5, marginTop: 2, fontWeight: "700" }} numberOfLines={1}>
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
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#1B7D2C", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bar-chart" size={16} color="#fff" />
        </View>
        <Text style={{ flex: 1, color: colors.navy, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>
          Your listings are getting more attention! You received 18% more views this month.
        </Text>
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: "#1B7D2C" }}>
          <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 11 }}>View Insights ›</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.navy }}>Your Listings</Text>
        <View style={{ flexDirection: "row", backgroundColor: "#EEF2F4", borderRadius: 10, padding: 3 }}>
          <View style={{ padding: 6, borderRadius: 8 }}>
            <Ionicons name="grid-outline" size={15} color="#9AA0A6" />
          </View>
          <View style={{ padding: 6, borderRadius: 8, backgroundColor: "#1B7D2C" }}>
            <Ionicons name="list" size={15} color="#fff" />
          </View>
        </View>
      </View>

      {myListings.map((item) => (
        <ListingManageCard key={item.id} item={item} />
      ))}

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
          Want to sell or rent faster? Promote your listing to reach more buyers.
        </Text>
        <View style={{ backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#1B7D2C", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16 }}>
          <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 11 }}>Promote Listing</Text>
        </View>
      </View>
    </>
  );
}

function Tool({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#E6E8EC",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 42,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <Ionicons name={icon} size={14} color="#4B5563" />
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#4B5563" }}>{label}</Text>
    </View>
  );
}

function ListingManageCard({ item }: { item: Listing }) {
  const pending = item.status === "Pending";
  const badgeColor = item.badge === "FEATURED" ? "#1B7D2C" : item.badge === "VERIFIED" ? "#2563EB" : "#1B7D2C";
  const metaItems =
    item.extra && item.extra.length
      ? item.extra
      : item.beds
        ? [`${item.beds} Beds`, `${item.baths} Baths`, item.sqft || ""].filter(Boolean)
        : [];

  return (
    <View
      style={{ backgroundColor: "#fff", borderRadius: 16, padding: 10, marginBottom: 12, flexDirection: "row", ...shadow.card }}
    >
      <View>
        <Image source={listingPhotos[item.id] ?? { uri: item.image }} style={{ width: 104, height: 112, borderRadius: 12, backgroundColor: "#E8EEF0" }} />
        {item.badge ? (
          <View style={{ position: "absolute", top: 7, left: 7, backgroundColor: badgeColor, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 0.3 }}>{item.badge}</Text>
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
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{item.views}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="chatbubble" size={9} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{item.inquiries}</Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, paddingLeft: 12, paddingTop: 2 }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: pending ? "#F59E0B" : "#1B7D2C" }} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: pending ? "#F59E0B" : "#1B7D2C" }}>{item.status}</Text>
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
          <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 13.5 }}>{item.price}</Text>
          <View
            style={{
              backgroundColor: item.dealType === "For Rent" ? "#E8F1FE" : "#E4F6EA",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: item.dealType === "For Rent" ? "#2563EB" : "#146B32", fontSize: 10, fontWeight: "800" }}>
              {item.dealType}
            </Text>
          </View>
        </View>
        {metaItems.length ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
            {metaItems.map((text) => (
              <Meta key={text} icon={metaIcon(text)} text={text} />
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <Text style={{ color: "#9AA0A6", fontSize: 10 }}>Posted on {item.postedOn}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ borderWidth: 1.5, borderColor: "#1B7D2C", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
              <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 10.5 }}>Manage</Text>
            </View>
            <Ionicons name="ellipsis-vertical" size={14} color="#9AA0A6" />
          </View>
        </View>
      </View>
    </View>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Ionicons name={icon} size={11} color="#9AA0A6" />
      <Text style={{ color: "#6B7280", fontSize: 10 }}>{text}</Text>
    </View>
  );
}
