import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { AuthImage } from "../components/AuthImage";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { SellerHeroBanner } from "../components/SellerHeroBanner";
import { ListingAdminNotesCard, StaffWarningCard } from "../components/StaffWarningBanner";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider } from "../demo";
import { fetchMyListings, type ApiListing } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openListing } from "../navigation/browse";
import { colors, shadow } from "../theme";
import { BuyerHomeScreen } from "./BuyerHomeScreen";

export function HomeScreen() {
  const { user } = useAuth();
  if (!isProvider(user)) return <BuyerHomeScreen />;
  return <SellerHomeScreen />;
}

function SellerHomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<ApiListing[]>([]);
  const name = user?.full_name || "Account";
  const pending = isPendingProvider(user);
  const verified = isVerifiedProvider(user);
  const rejected = isRejectedProvider(user);
  const photo = user?.photo_uri || "";
  const serviceLabel = user?.service_type || "Real Estate & Property Service";

  const loadPosts = useCallback(() => {
    void fetchMyListings()
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
      return subscribeListingsChanged(loadPosts);
    }, [loadPosts]),
  );

  const refreshControl = useAppRefreshControl(async () => {
    loadPosts();
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader right="bell-chat" />
      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <StaffWarningCard />
        <ListingAdminNotesCard listings={posts} />
        {pending ? (
          <View style={{ backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 14, marginBottom: 14, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: colors.navy }}>Verification pending</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
              Your {serviceLabel} application is with NAJIK admin. You can browse, but you cannot post until you are verified. This screen updates on its own when admin approves you.
            </Text>
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
          onCamera={() => navigation.jumpTo("Profile")}
          onViewListing={() => navigation.jumpTo("Listings")}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>Your Recent Posts</Text>
          {verified ? (
            <Text onPress={() => navigation.jumpTo("Listings")} style={{ color: colors.green, fontWeight: "700" }}>View all ›</Text>
          ) : null}
        </View>

        {verified && posts.length ? (
          posts.slice(0, 4).map((item) => <RecentPostCard key={item.id} item={item} />)
        ) : (
          <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 18, ...shadow.card }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              {verified
                ? "No listings yet. Use Add Listing to submit a post for admin review."
                : "No listings yet. After admin verifies you, you can post your services here."}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RecentPostCard({ item }: { item: ApiListing }) {
  const navigation = useNavigation<any>();
  const deal = String(item.extras?.dealType || item.subcategory || item.category);
  const pending = item.status !== "approved";
  const beds = item.extras?.beds;
  const baths = item.extras?.baths;
  const area = item.extras?.area;
  const priceDigits = String(item.price).replace(/\D/g, "");
  const price = Number(priceDigits);
  const photoUrl = item.photos[0]?.url;
  return (
    <PressScale
      onPress={() => openListing(navigation, item.id, true)}
      style={{ flexDirection: photoUrl ? "row" : "column", backgroundColor: colors.white, borderRadius: 16, padding: 10, marginBottom: 12, ...shadow.card }}
    >
      {photoUrl ? (
      <View>
        <AuthImage uri={photoUrl} style={{ width: 102, height: 108, borderRadius: 12 }} />
        <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: pending ? "#F59E0B" : "#1B7D2C", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{pending ? "PENDING" : "LIVE"}</Text>
        </View>
        <View style={{ position: "absolute", left: 6, bottom: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="eye" size={10} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{Number(item.view_count) || Number(item.extras?.views) || 0}</Text>
        </View>
      </View>
      ) : null}
      <View style={{ flex: 1, paddingLeft: photoUrl ? 12 : 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "800", fontSize: 14, flex: 1, color: colors.navy }}>{item.title}</Text>
          {!photoUrl ? (
            <View style={{ backgroundColor: pending ? "#F59E0B" : "#1B7D2C", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" }}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{pending ? "PENDING" : "LIVE"}</Text>
            </View>
          ) : (
            <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 11 }}>{item.location}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
          <Text style={{ color: "#1B7D2C", fontWeight: "800" }}>
            {priceDigits ? `Rs. ${Number.isFinite(price) ? price.toLocaleString("en-IN") : item.price}` : item.negotiable ? "Negotiable" : "Price on request"}
          </Text>
          <View style={{ backgroundColor: deal === "For Rent" ? colors.blueSoft : "#E4F6EA", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ color: deal === "For Rent" ? colors.blue : "#146B32", fontSize: 10, fontWeight: "800" }}>{deal}</Text>
          </View>
        </View>
        {beds || baths || area ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            {beds ? <Meta icon="bed-outline" label={`${beds} Beds`} /> : null}
            {baths ? <Meta icon="water-outline" label={`${baths} Baths`} /> : null}
            {area ? <Meta icon="resize-outline" label={`${area} sqft`} /> : null}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ color: colors.muted, fontSize: 10 }}>{pending ? "Pending admin review" : "Live in buyer feed"}</Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pending ? "#F59E0B" : "#1B7D2C" }} />
          </View>
          <View style={{ borderWidth: 1.5, borderColor: colors.green, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
            <Text style={{ color: colors.green, fontWeight: "800", fontSize: 11 }}>View Details</Text>
          </View>
        </View>
      </View>
    </PressScale>
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
