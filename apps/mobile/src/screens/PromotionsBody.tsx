import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { PressScale } from "../components/PressScale";
import { fetchMyListings, type ApiListing } from "../listingsApi";
import { openSellerPage } from "../navigation/browse";
import {
  createBoostCampaign,
  fetchBoostPricing,
  fetchMyBoostCampaigns,
  type BoostCampaign,
  type BoostPackage,
} from "../promotionsApi";
import { fetchSellerPaymentsMe } from "../paymentsApi";
import { friendlyError } from "../api";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const ORANGE = "#EA580C";

type Period = "day" | "week" | "month" | "all";

function periodStart(period: Period) {
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") return new Date(now.getTime() - 7 * 86400000);
  if (period === "month") return new Date(now.getTime() - 30 * 86400000);
  return null;
}

function statusTone(status: string) {
  if (status === "active") return { bg: "#E7F6EC", fg: GREEN, label: "Live" };
  if (status === "paused") return { bg: "#FFF7ED", fg: ORANGE, label: "Paused" };
  if (status === "expired") return { bg: "#F3F4F6", fg: "#6B7280", label: "Ended" };
  return { bg: "#FDECEC", fg: colors.red, label: status };
}

export function PromotionsBody() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pricing, setPricing] = useState<Awaited<ReturnType<typeof fetchBoostPricing>> | null>(null);
  const [campaigns, setCampaigns] = useState<BoostCampaign[]>([]);
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [balanceLabel, setBalanceLabel] = useState("—");
  const [period, setPeriod] = useState<Period>("week");
  const [campaignTab, setCampaignTab] = useState<"active" | "all">("active");
  const [selectedPack, setSelectedPack] = useState<BoostPackage | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pricingRow, campaignRows, listingRows, payments] = await Promise.all([
        fetchBoostPricing(),
        fetchMyBoostCampaigns(campaignTab),
        fetchMyListings(),
        fetchSellerPaymentsMe().catch(() => null),
      ]);
      setPricing(pricingRow);
      setCampaigns(campaignRows);
      setListings(listingRows.filter((row) => row.status === "approved"));
      setBalanceLabel(payments?.balance_label ?? "—");
      if (!selectedPack && pricingRow.packages?.length) {
        setSelectedPack(pricingRow.packages.find((p) => p.days === 7) ?? pricingRow.packages[0]);
      }
    } catch (err) {
      Alert.alert("Promotions", friendlyError(err, "Could not load promotions."));
    } finally {
      setLoading(false);
    }
  }, [campaignTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCampaigns = useMemo(() => {
    const start = periodStart(period);
    if (!start) return campaigns;
    return campaigns.filter((c) => new Date(c.created_at) >= start);
  }, [campaigns, period]);

  const stats = useMemo(() => {
    const views = filteredCampaigns.reduce((sum, c) => sum + c.display_view_count, 0);
    const inquiries = filteredCampaigns.reduce((sum, c) => sum + c.inquiry_count, 0);
    const impressions = filteredCampaigns.reduce((sum, c) => sum + c.impression_count, 0);
    const live = campaigns.filter((c) => c.status === "active" && c.days_remaining > 0).length;
    return { views, inquiries, impressions, live };
  }, [filteredCampaigns, campaigns]);

  async function confirmBoost(listing: ApiListing) {
    if (!selectedPack || !pricing?.is_active) return;
    setBusy(true);
    try {
      await createBoostCampaign(listing.id, selectedPack.days);
      setPickerOpen(false);
      Alert.alert(
        "Boost started",
        `“${listing.title}” is now promoted for ${selectedPack.days} days.`,
      );
      await load();
    } catch (err) {
      Alert.alert("Boost failed", friendlyError(err, "Could not start boost."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ paddingVertical: 48, alignItems: "center" }}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }

  if (!pricing?.is_active) {
    return (
      <View style={{ margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, ...shadow.card }}>
        <Text style={{ fontWeight: "800", fontSize: 16, color: colors.navy }}>Promotions paused</Text>
        <Text style={{ color: "#6B7280", marginTop: 8, lineHeight: 20 }}>
          Listing boosts are temporarily unavailable. Check back soon or contact support.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 20,
          backgroundColor: "#0E3D22",
          padding: 18,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "700" }}>WALLET BALANCE</Text>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 4 }}>{balanceLabel}</Text>
            <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 8, lineHeight: 18 }}>
              Boost listings to the top of category feeds and search. Slots rotate every 30 minutes for fair visibility.
            </Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="rocket" size={22} color="#FDE68A" />
          </View>
        </View>
        <View style={{ flexDirection: "row", marginTop: 16, gap: 8 }}>
          {(["day", "week", "month", "all"] as Period[]).map((p) => {
            const on = period === p;
            const label = p === "day" ? "Today" : p === "week" ? "Week" : p === "month" ? "Month" : "All";
            return (
              <PressScale
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: on ? "#FDE68A" : "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ fontWeight: "800", fontSize: 11, color: on ? "#0E3D22" : "#fff" }}>{label}</Text>
              </PressScale>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", marginTop: 14, gap: 10 }}>
          <StatBubble label="Views" value={String(stats.views)} />
          <StatBubble label="Inquiries" value={String(stats.inquiries)} />
          <StatBubble label="Impressions" value={String(stats.impressions)} />
          <StatBubble label="Live" value={String(stats.live)} />
        </View>
      </View>

      <Text style={{ fontWeight: "800", fontSize: 16, marginHorizontal: 16, marginTop: 18 }}>Choose a boost pack</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
        {pricing.packages.map((pack) => {
          const active = selectedPack?.days === pack.days;
          return (
            <PressScale
              key={pack.days}
              onPress={() => setSelectedPack(pack)}
              style={{
                width: 156,
                backgroundColor: active ? "#FFF7ED" : "#fff",
                borderRadius: 18,
                padding: 14,
                borderWidth: 2,
                borderColor: active ? ORANGE : "#E6E8EC",
                ...shadow.card,
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 13, color: ORANGE }}>{pack.days} days</Text>
              <Text style={{ fontWeight: "900", fontSize: 22, color: colors.navy, marginTop: 6 }}>{pack.price_label}</Text>
              <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 8 }}>~{pack.est_views} views</Text>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>~{pack.est_inquiries} inquiries</Text>
            </PressScale>
          );
        })}
      </ScrollView>

      <PressScale
        onPress={() => {
          if (!listings.length) {
            Alert.alert("No listings", "Approve a listing first, then return here to boost it.");
            return;
          }
          setPickerOpen(true);
        }}
        style={{
          marginHorizontal: 16,
          marginTop: 14,
          backgroundColor: GREEN,
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          ...shadow.card,
        }}
      >
        <Ionicons name="flash" size={18} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
          Boost a listing · {selectedPack?.price_label ?? ""}
        </Text>
      </PressScale>

      <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 18, gap: 8 }}>
        <TabChip label="Active" on={campaignTab === "active"} onPress={() => setCampaignTab("active")} />
        <TabChip label="All campaigns" on={campaignTab === "all"} onPress={() => setCampaignTab("all")} />
      </View>

      {filteredCampaigns.length === 0 ? (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", ...shadow.card }}>
          <Ionicons name="megaphone-outline" size={28} color="#C4C7CC" />
          <Text style={{ fontWeight: "800", marginTop: 10, color: colors.navy }}>No campaigns in this view</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, textAlign: "center" }}>
            Pick a pack and boost an approved listing to start getting more visibility.
          </Text>
        </View>
      ) : (
        filteredCampaigns.map((campaign) => {
          const tone = statusTone(campaign.status);
          return (
            <View
              key={campaign.id}
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 14,
                ...shadow.card,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ flex: 1, fontWeight: "800", fontSize: 15, color: colors.navy }} numberOfLines={1}>
                  {campaign.listing_title}
                </Text>
                <View style={{ backgroundColor: tone.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ color: tone.fg, fontWeight: "800", fontSize: 10 }}>{tone.label}</Text>
                </View>
              </View>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
                {campaign.listing_category} · {campaign.price_paid_label} · {campaign.duration_days} days
              </Text>
              {campaign.status === "active" ? (
                <Text style={{ color: GREEN, fontWeight: "700", fontSize: 12, marginTop: 6 }}>
                  {campaign.days_remaining} day{campaign.days_remaining === 1 ? "" : "s"} remaining
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                <Metric label="Views" value={campaign.display_view_count} />
                <Metric label="Impressions" value={campaign.impression_count} />
                <Metric label="Inquiries" value={campaign.inquiry_count} />
              </View>
            </View>
          );
        })
      )}

      <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: "#F3FBF5", borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: GREEN }}>
        <Text style={{ fontWeight: "800", color: colors.navy }}>Fair rotation</Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 6, lineHeight: 18 }}>
          Boosted listings rotate top slots every 30 minutes inside their category. Longer packs get a small priority edge.
        </Text>
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPickerOpen(false)} />
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: "70%" }}>
            <Text style={{ fontWeight: "900", fontSize: 18, color: colors.navy }}>Select listing to boost</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
              {selectedPack?.days} days · {selectedPack?.price_label} · ~{selectedPack?.est_views} expected views
            </Text>
            <ScrollView style={{ marginTop: 14 }} showsVerticalScrollIndicator={false}>
              {listings.map((listing) => (
                <PressScale
                  key={listing.id}
                  onPress={() => void confirmBoost(listing)}
                  disabled={busy}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: "#F7F8FA",
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: "#E6E8EC",
                  }}
                >
                  <Text style={{ fontWeight: "800", color: colors.navy }} numberOfLines={1}>{listing.title}</Text>
                  <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 4 }}>
                    {listing.category} · {listing.location || listing.city || "Nepal"}
                  </Text>
                </PressScale>
              ))}
            </ScrollView>
            <PressScale onPress={() => openSellerPage(navigation, "add-fund")} style={{ marginTop: 8, alignItems: "center", paddingVertical: 10 }}>
              <Text style={{ color: GREEN, fontWeight: "800" }}>Need more balance? Add funds</Text>
            </PressScale>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatBubble({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 10 }}>
      <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA", borderRadius: 12, padding: 10, alignItems: "center" }}>
      <Text style={{ fontWeight: "900", fontSize: 18, color: GREEN }}>{value}</Text>
      <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "700", marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function TabChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: on ? GREEN : "#fff",
        borderWidth: 1,
        borderColor: on ? GREEN : "#E6E8EC",
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 12, color: on ? "#fff" : "#374151" }}>{label}</Text>
    </PressScale>
  );
}
