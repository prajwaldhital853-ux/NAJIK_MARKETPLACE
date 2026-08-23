import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../components/Avatar";
import { ListingListRow } from "../components/ClassifiedCard";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { ReportComplaintModal } from "../components/ReportComplaintModal";
import { useAuth } from "../context/AuthContext";
import { listingsToCatalog } from "../data/liveListings";
import { fetchSellerProfile, type SellerPublicProfile } from "../listingsApi";
import { subscribeAppRefresh } from "../listingsRefresh";
import { colors } from "../theme";

const GREEN = colors.greenDeep;

export function SellerProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = String(route.params?.userId ?? "");
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const refreshControl = useAppRefreshControl();

  const load = useCallback(async () => {
    if (!userId) return;
    setProfile(await fetchSellerProfile(userId));
  }, [userId]);

  useEffect(() => {
    void load().catch((err) => Alert.alert("Profile", err instanceof Error ? err.message : "Could not load profile."));
    return subscribeAppRefresh(() => void load().catch(() => undefined));
  }, [load]);

  const items = listingsToCatalog(profile?.listings || []);

  async function callPhone() {
    if (!profile?.phone) return;
    const url = `tel:${profile.phone}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Call", profile.phone);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ width: 32 }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={{ fontWeight: "800", fontSize: 16, flex: 1 }}>Profile</Text>
          {userId && user?.id && String(userId) !== String(user.id) ? (
            <Pressable
              onPress={() => {
                if (!user) {
                  Alert.alert("Report", "Sign in to report this user.");
                  return;
                }
                if (String(userId) === String(user.id)) {
                  Alert.alert("Report", "You cannot report yourself.");
                  return;
                }
                setReportOpen(true);
              }}
              hitSlop={10}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text style={{ color: "#C62828", fontWeight: "800", fontSize: 13 }}>Report</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={refreshControl}>
        <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
          <Avatar name={profile?.full_name} uri={profile?.photo_url} size={88} />
          <Text style={{ fontWeight: "800", fontSize: 18, marginTop: 12 }}>{profile?.full_name || "…"}</Text>
          {profile?.business_name && profile.business_name !== profile?.full_name ? (
            <Text style={{ color: colors.muted, marginTop: 4 }}>{profile.business_name}</Text>
          ) : null}
          {profile?.service_type ? <Text style={{ color: GREEN, fontWeight: "700", marginTop: 4 }}>{profile.service_type}</Text> : null}
          {(profile?.rating_avg ?? 0) > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= Math.round(profile?.rating_avg || 0) ? "star" : "star-outline"}
                  size={16}
                  color="#F5C518"
                />
              ))}
              <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}>
                {profile?.rating_avg?.toFixed(1)} ({profile?.review_count ?? 0})
              </Text>
            </View>
          ) : null}
          {profile?.account_type === "user" ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Buyer on NAJIK</Text>
          ) : null}
        </View>
        {profile?.phone || profile?.email || profile?.address ? (
          <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
            {profile.phone ? (
              <Pressable onPress={() => void callPhone()} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="call-outline" size={18} color={GREEN} />
                <Text style={{ fontWeight: "700" }}>{profile.phone}</Text>
              </Pressable>
            ) : null}
            {profile.email ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="mail-outline" size={18} color={GREEN} />
                <Text style={{ flex: 1 }}>{profile.email}</Text>
              </View>
            ) : null}
            {profile.address ? (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Ionicons name="location-outline" size={18} color={GREEN} />
                <Text style={{ flex: 1 }}>{profile.address}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {(profile?.reviews?.length ?? 0) > 0 ? (
          <>
            <Text style={{ fontWeight: "800", fontSize: 15, marginTop: 18, marginBottom: 8 }}>Reviews</Text>
            {profile!.reviews!.map((row) => (
              <View
                key={row.id}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "700" }}>{row.author_name}</Text>
                  <Text style={{ fontWeight: "800", color: GREEN }}>{row.rating} ★</Text>
                </View>
                {row.text ? <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{row.text}</Text> : null}
              </View>
            ))}
          </>
        ) : null}
        <Text style={{ fontWeight: "800", fontSize: 15, marginTop: 18, marginBottom: 8 }}>Listings</Text>
        {items.length ? (
          items.map((item) => <ListingListRow key={item.id} item={item} />)
        ) : (
          <Text style={{ color: colors.muted, lineHeight: 20 }}>No approved listings yet.</Text>
        )}
      </ScrollView>
      <ReportComplaintModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="user"
        title={profile?.full_name || "User"}
        accusedId={userId}
      />
    </View>
  );
}
