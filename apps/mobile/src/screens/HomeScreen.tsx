import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { AppNoticeHost } from "../components/AppNoticeHost";
import { AuthImage } from "../components/AuthImage";
import { SalePrice } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { HomeBannerCarousel } from "../components/HomeBannerCarousel";
import { SellerHeroBanner } from "../components/SellerHeroBanner";
import { AccountStatusCard, ListingAdminNotesCard, StaffWarningCard } from "../components/StaffWarningBanner";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider, isRejectedProvider, isVerifiedProvider } from "../demo";
import { discountedAmount, listingDiscountPercent } from "../data/liveListings";
import { fetchMyListings, deleteMyListing, type ApiListing } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openListing } from "../navigation/browse";
import { colors, shadow } from "../theme";
import { BuyerHomeScreen } from "./BuyerHomeScreen";

export function HomeScreen() {
  const { user } = useAuth();
  return (
    <>
      {!isProvider(user) ? <BuyerHomeScreen /> : <SellerHomeScreen />}
      {/* Admin notices only after buyer/seller home is on screen */}
      <AppNoticeHost />
    </>
  );
}

function SellerHomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const name = user?.full_name || "Account";
  const pending = isPendingProvider(user);
  const verified = isVerifiedProvider(user);
  const rejected = isRejectedProvider(user);
  const photo = user?.photo_uri || "";
  const serviceLabel = user?.service_type || "Real Estate & Property Service";
  const liveHomePosts = posts.filter((item) => item.extras?.sold !== true && String(item.extras?.sold || "") !== "true");

  const loadPosts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await fetchMyListings(1, 10);
      setPosts(result);
    } catch (err) {
      if (!silent) setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
    return subscribeListingsChanged(() => void loadPosts(true));
  }, [loadPosts]);

  const refreshControl = useAppRefreshControl(async () => {
    loadPosts();
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader right="bell-chat" />
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <SellerHeroBanner
          name={name}
          photo={photo}
          serviceType={user?.service_type}
          verified={verified}
          pending={pending}
          rejected={rejected}
          variant="home"
          showPosted={verified}
          listingCount={posts.length}
          onPress={() => navigation.jumpTo("Profile")}
          onCamera={() => navigation.jumpTo("Profile")}
          onViewListing={() => navigation.jumpTo("Listings")}
        />
      </View>
      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <HomeBannerCarousel audience="provider" />
        <AccountStatusCard />
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

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>Your Recent Posts</Text>
          {verified ? (
            <Text onPress={() => navigation.jumpTo("Listings")} style={{ color: colors.green, fontWeight: "700" }}>View all ›</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 28, alignItems: "center", ...shadow.card }}>
            <ActivityIndicator color={colors.green} />
            <Text style={{ color: colors.muted, marginTop: 10, textAlign: "center" }}>Loading your listings…</Text>
          </View>
        ) : verified && liveHomePosts.length ? (
          liveHomePosts.slice(0, 4).map((item) => <RecentPostCard key={item.id} item={item} />)
        ) : (
          <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 18, ...shadow.card }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              {verified
                ? posts.length
                  ? "Sold listings stay on My Listings. Active posts will show here."
                  : "No listings yet. Use Add Listing to post live in the marketplace."
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
  const urgent = Boolean(item.is_urgent);
  const boosted = Boolean(item.is_boosted);
  const boostPaused = Boolean(item.boost_paused);
  const beds = item.extras?.beds;
  const baths = item.extras?.baths;
  const area = item.extras?.area;
  const priceDigits = String(item.price).replace(/\D/g, "");
  const price = Number(priceDigits);
  const photoUrl = item.photos[0]?.url;
  const percent = listingDiscountPercent(item.extras);
  const original = priceDigits ? `Rs. ${Number.isFinite(price) ? price.toLocaleString("en-IN") : item.price}` : item.negotiable ? "Negotiable" : "Price on request";
  const saleAmount = percent ? discountedAmount(item.price, percent) : original;

  function openMenu() {
    Alert.alert(item.title, undefined, [
      {
        text: "View details",
        onPress: () => openListing(navigation, item.id, true),
      },
      {
        text: "Delete listing",
        style: "destructive",
        onPress: () => {
          if (item.is_boosted) {
            Alert.alert(
              "Boost is live",
              "Pause the boost first (Promotions → Pause boost), then delete this listing.",
            );
            return;
          }
          Alert.alert("Delete listing", `Remove “${item.title}” permanently? This also removes it from the admin panel.`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void deleteMyListing(item.id).catch((err) =>
                  Alert.alert("Delete failed", err instanceof Error ? err.message : "Could not delete listing."),
                );
              },
            },
          ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <PressScale
      onPress={() => openListing(navigation, item.id, true)}
      style={{ flexDirection: photoUrl ? "row" : "column", backgroundColor: colors.white, borderRadius: 16, padding: 10, marginBottom: 12, ...shadow.card }}
    >
      {photoUrl ? (
      <View>
        <AuthImage uri={photoUrl} style={{ width: 102, height: 108, borderRadius: 12 }} />
        <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: urgent ? "#EAB308" : boosted ? "#EA580C" : boostPaused ? "#9CA3AF" : pending ? "#F59E0B" : "#1B7D2C", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: urgent ? "#111827" : "#fff", fontSize: 9, fontWeight: "800" }}>
            {urgent ? "URGENT" : boosted ? "BOOSTED" : boostPaused ? "BOOST PAUSED" : pending ? "PENDING" : "LIVE"}
          </Text>
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
          <PressScale onPress={openMenu} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
          </PressScale>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 11 }}>{item.location}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <SalePrice amount={saleAmount} originalPrice={percent ? original : undefined} discountPercent={percent || undefined} compact />
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
            <Text style={{ color: colors.muted, fontSize: 10 }}>{pending ? "Edit pending review" : "Live in buyer feed"}</Text>
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
