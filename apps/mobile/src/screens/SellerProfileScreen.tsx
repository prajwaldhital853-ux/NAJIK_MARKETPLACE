import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
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

type ProfilePreview = {
  full_name?: string;
  account_type?: "user" | "provider";
};

export function SellerProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = String(route.params?.userId ?? "");
  const preview = useMemo<ProfilePreview>(
    () => ({
      full_name: route.params?.full_name,
      account_type: route.params?.account_type,
    }),
    [route.params?.full_name, route.params?.account_type],
  );
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const refreshControl = useAppRefreshControl(load);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setProfile(await fetchSellerProfile(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load().catch((err) => Alert.alert("Profile", err instanceof Error ? err.message : "Could not load profile."));
    return subscribeAppRefresh(() => void load().catch(() => undefined));
  }, [load]);

  const displayName = profile?.full_name || preview.full_name || "Profile";
  const displayAccountType = profile?.account_type || preview.account_type;
  const isBuyer = displayAccountType === "user";
  const items = isBuyer ? [] : listingsToCatalog(profile?.listings || []);
  const reviews = profile?.reviews || [];
  const hasPreview = Boolean(preview.full_name);
  const showBlockingLoader = loading && !profile && !hasPreview;

  async function openPhone() {
    if (!profile?.phone) return;
    const url = `tel:${profile.phone.replace(/\s/g, "")}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Call", profile.phone);
  }

  async function openEmail() {
    if (!profile?.email) return;
    const url = `mailto:${profile.email}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Email", profile.email);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ width: 32 }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={{ fontWeight: "800", fontSize: 16, flex: 1 }} numberOfLines={1}>{displayName}</Text>
          {loading ? <ActivityIndicator color={GREEN} size="small" /> : null}
          {userId && user?.id && String(userId) !== String(user.id) ? (
            <Pressable onPress={() => setReportOpen(true)} hitSlop={10} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: "#C62828", fontWeight: "800", fontSize: 13 }}>Report</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {showBlockingLoader ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator color={GREEN} size="large" />
          <Text style={{ color: colors.muted, fontWeight: "600" }}>Opening profile…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} refreshControl={refreshControl}>
          <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
            <Avatar name={displayName} uri={profile?.photo_url} size={88} />
            <Text style={{ fontWeight: "800", fontSize: 18, marginTop: 12 }}>{displayName}</Text>
            {!isBuyer && profile?.business_name && profile.business_name !== profile?.full_name ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{profile.business_name}</Text>
            ) : null}
            {!isBuyer && profile?.service_type ? <Text style={{ color: GREEN, fontWeight: "700", marginTop: 4 }}>{profile.service_type}</Text> : null}
            {!isBuyer && (profile?.rating_avg ?? 0) > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons key={n} name={n <= Math.round(profile?.rating_avg || 0) ? "star" : "star-outline"} size={16} color="#F5C518" />
                ))}
                <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}>
                  {profile?.rating_avg?.toFixed(1)} ({profile?.review_count ?? 0})
                </Text>
              </View>
            ) : null}
            {isBuyer ? <Text style={{ color: colors.muted, marginTop: 6 }}>Buyer on NAJIK</Text> : null}
          </View>
          {profile?.phone || profile?.email || profile?.address ? (
            <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
              {profile.phone ? (
                <Pressable onPress={() => void openPhone()} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="call-outline" size={18} color={GREEN} />
                  <Text style={{ fontWeight: "700", color: GREEN }}>{profile.phone}</Text>
                </Pressable>
              ) : null}
              {profile.email ? (
                <Pressable onPress={() => void openEmail()} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="mail-outline" size={18} color={GREEN} />
                  <Text style={{ fontWeight: "700", color: GREEN, flex: 1 }}>{profile.email}</Text>
                </Pressable>
              ) : null}
              {profile.address ? (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Ionicons name="location-outline" size={18} color={GREEN} />
                  <Text style={{ flex: 1 }}>{profile.address}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {!isBuyer && reviews.length > 0 ? (
            <>
              <Text style={{ fontWeight: "800", fontSize: 15, marginTop: 18, marginBottom: 8 }}>Reviews</Text>
              {reviews.map((row) => (
                <View key={row.id} style={{ backgroundColor: colors.white, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontWeight: "700" }}>{row.author_name}</Text>
                    <Text style={{ fontWeight: "800", color: GREEN }}>{row.rating} ★</Text>
                  </View>
                  {row.text ? <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{row.text}</Text> : null}
                </View>
              ))}
            </>
          ) : null}
          {!isBuyer ? (
            <>
              <Text style={{ fontWeight: "800", fontSize: 15, marginTop: 18, marginBottom: 8 }}>Listings</Text>
              {items.length ? (
                items.map((item) => <ListingListRow key={item.id} item={item} />)
              ) : loading && !profile ? (
                <ActivityIndicator color={GREEN} style={{ marginTop: 8 }} />
              ) : (
                <Text style={{ color: colors.muted, lineHeight: 20 }}>No live listings right now.</Text>
              )}
            </>
          ) : null}
        </ScrollView>
      )}
      <ReportComplaintModal visible={reportOpen} onClose={() => setReportOpen(false)} kind="user" title={displayName} accusedId={userId} />
    </View>
  );
}
