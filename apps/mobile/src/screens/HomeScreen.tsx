import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Image, ScrollView, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { PressScale } from "../components/PressScale";
import { SellerHeroBanner } from "../components/SellerHeroBanner";
import { useAuth } from "../context/AuthContext";
import { nearbyListings } from "../data/mock";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider } from "../demo";
import { colors, shadow } from "../theme";
import type { Listing } from "../types";
import { BuyerHomeScreen } from "./BuyerHomeScreen";

export function HomeScreen() {
  const { user } = useAuth();
  if (!isProvider(user)) return <BuyerHomeScreen />;
  return <SellerHomeScreen />;
}

function SellerHomeScreen() {
  const { user, refreshVerification } = useAuth();
  const navigation = useNavigation<any>();
  const name = user?.full_name || "Sunil K. Sah";
  const pending = isPendingProvider(user);
  const verified = isVerifiedProvider(user);
  const rejected = isRejectedProvider(user);
  const photo = user?.photo_uri || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80";
  const serviceLabel = user?.service_type || "Real Estate & Property Service";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader right="bell-chat" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {pending ? (
          <View style={{ backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Verification pending</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
              Your {serviceLabel} application is with NAJIK admin. You can browse, but you cannot post until you are verified.
            </Text>
            <PressScale onPress={() => void refreshVerification()} style={{ marginTop: 10, alignSelf: "flex-start" }}>
              <Text style={{ color: colors.green, fontWeight: "800" }}>Check status</Text>
            </PressScale>
          </View>
        ) : null}
        {rejected ? (
          <View style={{ backgroundColor: colors.redSoft, borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Application rejected</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
              Admin did not approve this application. You cannot post services yet.
            </Text>
          </View>
        ) : null}
        <SellerHeroBanner
          name={name}
          photo={photo}
          serviceType={user?.service_type}
          verified={verified}
          pending={pending}
          rejected={rejected}
          variant="home"
          showPosted={verified}
          onPress={() => navigation.jumpTo("Profile")}
          onViewListing={() => navigation.jumpTo("Listings")}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>Your Recent Posts</Text>
          {verified ? (
            <Text onPress={() => navigation.jumpTo("Listings")} style={{ color: colors.green, fontWeight: "700" }}>View all ›</Text>
          ) : null}
        </View>

        {verified ? (
          nearbyListings.map((item) => <RecentPostCard key={item.id} item={item} />)
        ) : (
          <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 18, ...shadow.card }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              No listings yet. After admin verifies you, you can post your services here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RecentPostCard({ item }: { item: Listing }) {
  return (
    <View
      style={{ flexDirection: "row", backgroundColor: colors.white, borderRadius: 16, padding: 10, marginBottom: 12, ...shadow.card }}
    >
      <View>
        <Image source={{ uri: item.image }} style={{ width: 102, height: 108, borderRadius: 12 }} />
        <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: "#1B7D2C", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>LIVE</Text>
        </View>
        <View style={{ position: "absolute", left: 6, bottom: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="eye" size={10} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{item.views}</Text>
        </View>
      </View>
      <View style={{ flex: 1, paddingLeft: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "800", fontSize: 14, flex: 1, color: colors.navy }}>{item.title}</Text>
          <View style={{ flexDirection: "row", gap: 10, paddingLeft: 6 }}>
            <Ionicons name="share-outline" size={16} color={colors.muted} />
            <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 11 }}>{item.location}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
          <Text style={{ color: "#1B7D2C", fontWeight: "800" }}>{item.price}</Text>
          <View style={{ backgroundColor: item.dealType === "For Rent" ? colors.blueSoft : "#E4F6EA", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ color: item.dealType === "For Rent" ? colors.blue : "#146B32", fontSize: 10, fontWeight: "800" }}>{item.dealType}</Text>
          </View>
        </View>
        {item.beds ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            <Meta icon="bed-outline" label={`${item.beds} Beds`} />
            <Meta icon="water-outline" label={`${item.baths} Baths`} />
            <Meta icon="resize-outline" label={item.sqft || ""} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ color: colors.muted, fontSize: 10 }}>{item.time}</Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#1B7D2C" }} />
          </View>
          <View style={{ borderWidth: 1.5, borderColor: colors.green, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
            <Text style={{ color: colors.green, fontWeight: "800", fontSize: 11 }}>View Details</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Ionicons name={icon} size={11} color={colors.muted} />
      <Text style={{ color: colors.muted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}
