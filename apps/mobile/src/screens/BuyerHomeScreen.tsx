import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, Image, ScrollView, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { PressScale } from "../components/PressScale";
import { buyerNearbyListings } from "../data/mock";
import { colors, shadow } from "../theme";
import type { Listing } from "../types";

const housePhoto = require("../../assets/listings/house.jpg");
const listingPhotos: Record<string, number> = {
  b1: require("../../assets/listings/flat.jpg"),
  b2: require("../../assets/listings/land.jpg"),
  b3: require("../../assets/listings/house.jpg"),
  b4: require("../../assets/listings/apartment.jpg"),
  b5: require("../../assets/listings/modern.jpg"),
  b6: require("../../assets/listings/shop.jpg"),
  b7: require("../../assets/listings/car.jpg"),
  b8: require("../../assets/listings/office.jpg"),
  b9: require("../../assets/listings/phone.jpg"),
  b10: require("../../assets/listings/tools.jpg"),
};

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 11;
const TILE = (SCREEN_W - PAD * 2 - GAP * 3) / 4;
const CARD_W = (SCREEN_W - PAD * 2 - GAP) / 2;
const FOREST = "#0E4A3C";

const categories: { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }[] = [
  { label: "Property", icon: "home", bg: "#E8F1FE", color: "#1D4ED8" },
  { label: "Vehicles", icon: "car", bg: "#E8F1FE", color: "#1D4ED8" },
  { label: "Jobs", icon: "briefcase", bg: "#FFF1E0", color: "#C2410C" },
  { label: "Services", icon: "construct", bg: "#FFF1E8", color: "#C2410C" },
  { label: "Used Items", icon: "bed", bg: "#EAF8EE", color: "#166534" },
  { label: "Shops", icon: "storefront", bg: "#FDECEC", color: "#DC2626" },
  { label: "Electronics", icon: "phone-portrait", bg: "#EEF4FF", color: "#1D4ED8" },
  { label: "Others", icon: "apps", bg: "#EEF4FF", color: "#1D4ED8" },
];

export function BuyerHomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader showLocation bellCount={3} />
      <ScrollView contentContainerStyle={{ padding: PAD, paddingTop: 10, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <BuyerHomeBody />
      </ScrollView>
    </View>
  );
}

function BuyerHomeBody() {
  const navigation = useNavigation<any>();

  return (
    <>
      <PressScale
        onPress={() => navigation.jumpTo("Explore")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: 18,
          paddingLeft: 14,
          height: 52,
          ...shadow.card,
        }}
      >
        <Ionicons name="search" size={18} color="#9AA0A6" />
        <Text style={{ flex: 1, marginLeft: 8, fontSize: 13, color: "#9AA0A6" }}>Search rooms, land, jobs, services...</Text>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: "#1B7D2C",
            alignItems: "center",
            justifyContent: "center",
            margin: 4,
          }}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </View>
      </PressScale>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: GAP }}>
        {categories.map((item) => (
          <PressScale
            key={item.label}
            onPress={() => navigation.jumpTo("Explore")}
            style={{
              width: TILE,
              backgroundColor: item.bg,
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 2,
              alignItems: "center",
            }}
          >
            <Ionicons name={item.icon} size={34} color={item.color} />
            <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 4, color: "#111827" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {item.label}
            </Text>
          </PressScale>
        ))}
      </View>

      <View style={{ marginTop: 18, height: 156, borderRadius: 18, overflow: "hidden", ...shadow.card }}>
        <Image source={housePhoto} style={{ position: "absolute", right: 0, top: 0, width: "62%", height: "100%" }} resizeMode="cover" />
        <LinearGradient
          colors={[FOREST, FOREST, "rgba(14,74,60,0.55)", "transparent"]}
          locations={[0, 0.36, 0.58, 0.86]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: 0 }}
        />
        <View style={{ position: "absolute", left: 16, top: 18, right: "36%" }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 24 }}>
            Find the Best{"\n"}
            <Text style={{ color: "#7CDE6A" }}>Property</Text> Near You
          </Text>
          <Text style={{ color: "#D5EDE4", marginTop: 4, fontSize: 12 }}>Trusted. Local. Easy.</Text>
          <PressScale
            onPress={() => navigation.jumpTo("Explore")}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              backgroundColor: "#fff",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text style={{ color: FOREST, fontWeight: "800", fontSize: 12 }}>Explore Now</Text>
            <Ionicons name="arrow-forward" size={12} color={FOREST} />
          </PressScale>
        </View>
        <View
          style={{
            position: "absolute",
            right: 16,
            top: 14,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            ...shadow.card,
          }}
        >
          <Ionicons name="location" size={16} color="#2F80ED" />
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>Nearby Listings</Text>
        <Text style={{ color: "#1B7D2C", fontWeight: "700" }}>View all ›</Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
        {buyerNearbyListings.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </View>
    </>
  );
}

function ListingCard({ item }: { item: Listing }) {
  return (
    <View style={{ width: CARD_W, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", ...shadow.card }}>
      <View>
        <Image source={listingPhotos[item.id] ?? { uri: item.image }} style={{ width: "100%", height: 110, backgroundColor: "#E8EEF0" }} />
        {item.badge ? (
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#1B7D2C", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{item.badge}</Text>
          </View>
        ) : null}
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: "rgba(255,255,255,0.95)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="heart-outline" size={14} color="#374151" />
        </View>
      </View>
      <View style={{ padding: 10 }}>
        <Text style={{ fontWeight: "800", fontSize: 13, color: colors.navy }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: "#1B7D2C", fontWeight: "800", marginTop: 4, fontSize: 13 }}>{item.price}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="location-outline" size={11} color="#9AA0A6" />
            <Text style={{ color: "#8A8F98", fontSize: 10 }} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="time-outline" size={11} color="#9AA0A6" />
            <Text style={{ color: "#8A8F98", fontSize: 10 }}>{item.time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

