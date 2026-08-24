import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { InviteEarnBody } from "../components/InviteEarnBody";
import { AppHeader } from "../components/AppHeader";
import { AppImage } from "../components/AppImage";
import { AuthImage } from "../components/AuthImage";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { SellerProfileEditModal } from "../components/SellerProfileEditModal";
import { updateProviderPrivacySettings, fetchSellerApplication } from "../authApi";
import { useAuth } from "../context/AuthContext";
import { useInbox, noticeSenderLabel, noticeKindLabel } from "../context/InboxContext";
import { isPendingProvider, isRejectedProvider, isVerifiedProvider, isProvider } from "../demo";
import { BookingsBody } from "./BookingsScreen";
import {
  helpFaqs,
  payouts,
  sellerPageMeta,
  sellerSaved,
  type SellerPage,
} from "../data/sellerHub";
import { PromotionsBody } from "./PromotionsBody";
import { ChatInboxList } from "./ChatInboxScreen";
import { choosePhoto } from "../pickPhoto";
import { openChatThread, openListing, openSellerPage } from "../navigation/browse";
import type { InboxNotice } from "../inboxApi";
import { fetchSellerEarningsSummary } from "../earningsApi";
import { fetchMyListings, fetchMySellerReviews, updateListing, type ApiListing } from "../listingsApi";
import { createSellerLoadRequest, fetchSellerPaymentsMe, resolvePaymentAssetUrl } from "../paymentsApi";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const PAGES: SellerPage[] = [
  "bookings",
  "reviews",
  "earnings",
  "promotions",
  "services",
  "saved",
  "kyc",
  "notifications",
  "messages",
  "settings",
  "help",
  "payments",
  "add-fund",
  "invite",
];

export function SellerHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const page: SellerPage = PAGES.includes(route.params?.page) ? route.params.page : "bookings";
  const meta = sellerPageMeta[page];
  const keyboardForm = page === "add-fund";

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader onClose={() => navigation.goBack()} right="bell-chat" showPro />
      <KeyboardScreen fill={false} adjustKeyboardInsets={keyboardForm} contentStyle={{ paddingBottom: keyboardForm ? 40 : 28 }}>
        <PageHead meta={meta} />
        <PageBody page={page} />
      </KeyboardScreen>
    </View>
  );
}

function PageHead({ meta }: { meta: (typeof sellerPageMeta)[SellerPage] }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", fontSize: 20, color: "#111827" }}>{meta.title}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{meta.sub}</Text>
      </View>
    </View>
  );
}

function QuickRow({
  items,
}: {
  items: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[];
}) {
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 }}>
      {items.map((item) => (
        <PressScale
          key={item.label}
          onPress={item.onPress}
          style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", ...shadow.card }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={item.icon} size={16} color={GREEN} />
          </View>
          <Text style={{ fontWeight: "700", fontSize: 10, marginTop: 6, color: "#111827", textAlign: "center" }}>{item.label}</Text>
        </PressScale>
      ))}
    </View>
  );
}

function PageBody({ page }: { page: SellerPage }) {
  if (page === "bookings") return <BookingsBody showSellers={false} />;
  if (page === "reviews") return <ReviewsBody />;
  if (page === "earnings") return <EarningsBody />;
  if (page === "promotions") return <PromotionsBody />;
  if (page === "services") return <ServicesBody />;
  if (page === "saved") return <SavedBody />;
  if (page === "kyc") return <KycBody />;
  if (page === "notifications") return <NotesBody />;
  if (page === "messages") return <MessagesBody />;
  if (page === "settings") return <SettingsBody />;
  if (page === "help") return <HelpBody />;
  if (page === "invite") return <InviteEarnBody audience="provider" />;
  if (page === "add-fund") return <AddFundBody />;
  return <PaymentsBody />;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        paddingLeft: 12,
        height: 48,
        borderWidth: 1,
        borderColor: "#E6E8EC",
      }}
    >
      <Ionicons name="search" size={18} color="#9AA0A6" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA0A6"
        onFocus={onInputFocus}
        style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy }}
      />
    </View>
  );
}

function Chips({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
      {items.map((item) => {
        const on = item === value;
        return (
          <PressScale
            key={item}
            onPress={() => onChange(item)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 18,
              backgroundColor: on ? GREEN : "#fff",
              borderWidth: 1,
              borderColor: on ? GREEN : "#E6E8EC",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 12, color: on ? "#fff" : "#374151" }}>{item}</Text>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

function formatReviewWhen(created_at: string) {
  const d = new Date(created_at);
  if (Number.isNaN(d.getTime())) return created_at;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ratingDistribution(reviews: { rating: number }[]) {
  const counts = [0, 0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const n = Math.min(5, Math.max(1, Math.round(r.rating)));
    counts[n] += 1;
  });
  const total = reviews.length;
  return { counts, total, avg: total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0 };
}

function serviceListingLive(item: ApiListing) {
  if (item.status !== "approved") return false;
  const extras = item.extras || {};
  if (extras.sold === true || extras.sold === "true") return false;
  if (extras.paused === true || extras.paused === "true") return false;
  return true;
}

function ReviewsBody() {
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<
    { id: string; name: string; rating: number; text: string; time: string; listing: string }[]
  >([]);
  const [avgRating, setAvgRating] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    void fetchMySellerReviews()
      .then((payload) => {
        const rows = (payload.reviews || []).map((row) => ({
          id: row.id,
          name: row.author_name || "Buyer",
          rating: row.rating,
          text: row.text,
          time: formatReviewWhen(row.created_at),
          listing: row.listing_title || "Listing",
        }));
        setReviews(rows);
        setAvgRating(payload.rating_avg ?? (rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0));
      })
      .catch(() => {
        setReviews([]);
        setAvgRating(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const dist = ratingDistribution(reviews);
  const list = reviews.filter((row) => filter === "All" || (filter === "5★" ? row.rating >= 5 : row.rating >= 4 && row.rating < 5));

  return (
    <>
      <QuickRow
        items={[
          {
            icon: "refresh-outline",
            label: "Refresh",
            onPress: load,
          },
          { icon: "share-social-outline", label: "Share", onPress: () => void Share.share({ message: `See my ${avgRating.toFixed(1)} rating on NAJIK` }) },
        ]}
      />
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 36, fontWeight: "800", color: "#111827" }}>{avgRating.toFixed(1)}</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            {[5, 4, 3, 2, 1].map((n) => (
              <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <Text style={{ width: 10, fontSize: 10, color: "#6B7280" }}>{n}</Text>
                <View style={{ flex: 1, height: 6, backgroundColor: "#EEF0F2", borderRadius: 4, overflow: "hidden" }}>
                  <View
                    style={{
                      width: `${dist.total ? (dist.counts[n] / dist.total) * 100 : 0}%`,
                      height: "100%",
                      backgroundColor: "#F5C518",
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 8 }}>{reviews.length} review{reviews.length === 1 ? "" : "s"} from buyers</Text>
      </View>
      <Chips items={["All", "5★", "4★"]} value={filter} onChange={setFilter} />
      {loading ? (
        <Text style={{ textAlign: "center", color: "#6B7280", marginTop: 24 }}>Loading reviews…</Text>
      ) : list.length === 0 ? (
        <Text style={{ textAlign: "center", color: "#6B7280", marginTop: 24, paddingHorizontal: 24 }}>
          No reviews yet. Buyers can rate you after visiting a listing.
        </Text>
      ) : (
        list.map((row) => (
          <View key={row.id} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontWeight: "800", color: GREEN }}>{row.name[0] || "B"}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: "800", fontSize: 14 }}>{row.name}</Text>
                <Text style={{ color: "#9AA0A6", fontSize: 11 }}>Buyer · {row.listing} · {row.time}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons key={n} name="star" size={12} color={n <= row.rating ? "#F5C518" : "#E6E8EC"} />
                ))}
              </View>
            </View>
            <Text style={{ color: "#4B5563", fontSize: 13, lineHeight: 20, marginTop: 10 }}>{row.text}</Text>
          </View>
        ))
      )}
    </>
  );
}

function EarningsBody() {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchSellerEarningsSummary>> | null>(null);

  useEffect(() => {
    void fetchSellerEarningsSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  return (
    <>
      <StatStrip
        items={[
          { n: summary?.loaded_balance_label ?? "—", l: "Loaded balance" },
          { n: summary?.referrer_balance_label ?? "—", l: "Refer & Earn" },
          { n: summary?.combined_balance_label ?? "—", l: "Combined" },
        ]}
      />
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
        <Text style={{ fontWeight: "800", fontSize: 14 }}>Listing fee: {summary?.listing_fee_label ?? "—"} per live post</Text>
        <Text style={{ color: "#6B7280", marginTop: 6, fontSize: 12, lineHeight: 18 }}>
          Loaded balance pays listing fees. Refer & Earn credits when friends join and publish. Offline payout only.
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <PressScale
            onPress={() => navigation.navigate("SellerHub", { page: "payments" })}
            style={{ flex: 1, backgroundColor: GREEN, paddingVertical: 10, borderRadius: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Add funds</Text>
          </PressScale>
          <PressScale
            onPress={() => navigation.navigate("SellerHub", { page: "invite" })}
            style={{ flex: 1, backgroundColor: "#E7F6EC", paddingVertical: 10, borderRadius: 10, alignItems: "center" }}
          >
            <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>Invite & Earn</Text>
          </PressScale>
        </View>
      </View>
    </>
  );
}

function usePaymentsData() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchSellerPaymentsMe>> | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() =>
    fetchSellerPaymentsMe()
      .then(setData)
      .catch(() => setData(null)),
  []);

  useFocusEffect(
    useCallback(() => {
      void reload().finally(() => setLoading(false));
      const poll = setInterval(() => void reload(), 8000);
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") void reload();
      });
      return () => {
        clearInterval(poll);
        sub.remove();
      };
    }, [reload]),
  );

  return { data, loading, reload };
}

function PaymentsBody() {
  const navigation = useNavigation<any>();
  const { data, loading } = usePaymentsData();
  const fee = data?.config?.listing_fee_rupees ?? 0;
  const balanceListings = fee > 0 ? Math.floor((data?.balance_paisa ?? 0) / (fee * 100)) : 0;
  const cfg = data?.config;
  const pending = data?.pending_load;
  const approvedHistory = (data?.recent_load_requests ?? []).filter((r) => r.status !== "pending");
  const transactions = data?.transactions ?? [];

  const loadedLabel = data?.loaded_balance_label ?? data?.balance_label ?? "Rs. 0";
  const referLabel = data?.refer_earn_remaining_label ?? data?.refer_earn_total_label ?? "Rs. 0";
  const totalLabel = data?.balance_label ?? "Rs. 0";

  function txTitle(row: { kind: string; kind_label?: string }) {
    return row.kind_label || row.kind.replace(/_/g, " ");
  }

  function ActivityCard({ row }: { row: (typeof transactions)[number] }) {
    const invite = row.kind === "referral_reward";
    return (
      <View
        key={row.id}
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          backgroundColor: invite ? "#E8F1FE" : "#fff",
          borderRadius: 14,
          padding: 12,
          borderWidth: invite ? 1 : 0,
          borderColor: invite ? "#BFDBFE" : "transparent",
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <Text style={{ flex: 1, fontWeight: "800", fontSize: 13, color: invite ? "#1D4ED8" : colors.navy }}>{txTitle(row)}</Text>
          <Text style={{ fontWeight: "800", color: row.amount_paisa >= 0 ? GREEN : colors.red }}>{row.amount_label}</Text>
        </View>
        {row.listing_title ? (
          <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 4 }} numberOfLines={1}>
            {invite ? `Friend: ${row.listing_title}` : row.listing_title}
          </Text>
        ) : null}
        <Text style={{ color: "#8A8F98", fontSize: 10, marginTop: 4 }}>Balance {row.balance_after_label}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 18, backgroundColor: GREEN, ...shadow.card }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }}>TOTAL BALANCE</Text>
          <Text style={{ color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 2 }}>{loading ? "…" : totalLabel}</Text>
          <View style={{ flexDirection: "row", marginTop: 14, gap: 10 }}>
            <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)", paddingTop: 10 }}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}>Loaded</Text>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginTop: 3 }} numberOfLines={1}>
                {loading ? "…" : loadedLabel}
              </Text>
            </View>
            <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)", paddingTop: 10 }}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}>Invite & Earn</Text>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginTop: 3 }} numberOfLines={1}>
                {loading ? "…" : referLabel}
              </Text>
            </View>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 11, marginTop: 12 }}>
            {cfg?.listing_fee_label ?? "Per listing"} · ≈ {balanceListings} live post{balanceListings === 1 ? "" : "s"} left
          </Text>
        </View>
      </View>

      <PressScale
        onPress={() => openSellerPage(navigation, "add-fund")}
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: "#2563EB",
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          ...shadow.card,
        }}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Add funds via bank</Text>
      </PressScale>

      {pending ? (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#FFF7ED", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#FDBA74" }}>
          <Text style={{ fontWeight: "800", color: "#C2410C" }}>Pending top-up: {pending.amount_label}</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
            Ref: {pending.payment_reference || "—"} · {new Date(pending.created_at).toLocaleString()}
          </Text>
        </View>
      ) : null}

      {approvedHistory.length ? (
        <>
          <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 18, marginBottom: 8 }}>Top-up history</Text>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={approvedHistory.length > 3}
            style={{ maxHeight: approvedHistory.length > 3 ? 168 : undefined }}
          >
            {approvedHistory.map((row) => (
              <View
                key={row.id}
                style={{
                  marginHorizontal: 16,
                  marginTop: 6,
                  backgroundColor: row.status === "approved" ? "#ECFDF5" : "#FEF2F2",
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: row.status === "approved" ? "#A7F3D0" : "#FECACA",
                }}
              >
                <Text style={{ fontWeight: "800", fontSize: 12, color: row.status === "approved" ? "#065F46" : "#B91C1C" }}>
                  {row.status === "approved" ? "Approved" : "Rejected"} · {row.amount_label}
                </Text>
                {row.admin_note ? <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{row.admin_note}</Text> : null}
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 18, marginBottom: 8 }}>Activity</Text>
      {transactions.length === 0 && !loading ? (
        <Text style={{ color: "#6B7280", marginHorizontal: 16, fontSize: 13 }}>No payment activity yet.</Text>
      ) : (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={transactions.length > 4}
          style={{ maxHeight: transactions.length > 4 ? 320 : undefined }}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {transactions.map((row) => (
            <ActivityCard key={row.id} row={row} />
          ))}
        </ScrollView>
      )}
    </>
  );
}

function AddFundBody() {
  const navigation = useNavigation<any>();
  const { onInputFocus, scrollAnchorIntoView } = useKeyboardScroll();
  const { refresh: refreshInbox } = useInbox();
  const { data, loading, reload } = usePaymentsData();
  const [amount, setAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<View>(null);

  const fee = data?.config?.listing_fee_rupees ?? 0;
  const amountNum = Number(amount.replace(/\D/g, "")) || 0;
  const listingsYouGet = fee > 0 && amountNum > 0 ? Math.floor(amountNum / fee) : 0;
  const cfg = data?.config;
  const qrUrl = cfg?.qr_code_url ? resolvePaymentAssetUrl(cfg.qr_code_url) : "";

  function focusField() {
    onInputFocus();
    scrollAnchorIntoView(formRef.current);
  }

  async function submitPaid() {
    const rupees = amountNum;
    if (!rupees || rupees <= 0) {
      Alert.alert("Amount required", "Enter how much you paid in rupees.");
      return;
    }
    setSubmitting(true);
    try {
      await createSellerLoadRequest({
        amount_rupees: rupees,
        payment_reference: paymentRef.trim(),
        proof_uri: proofUri || undefined,
      });
      Alert.alert("Submitted", "Your load request is pending. Admin will credit your balance after verifying payment.");
      setAmount("");
      setPaymentRef("");
      setProofUri(null);
      await reload();
      await refreshInbox();
      navigation.navigate("SellerHub", { page: "payments" });
    } catch (err) {
      Alert.alert("Could not submit", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: "#E8F1FE", borderRadius: 14, padding: 12 }}>
        <Text style={{ fontWeight: "800", color: "#1D4ED8" }}>Pay offline, then submit proof</Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, lineHeight: 18 }}>
          Transfer to the bank below or scan QR. After paying, fill the form and attach a screenshot if you have one.
        </Text>
      </View>

      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 18 }}>Bank details & QR</Text>
      <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
        {loading && !cfg ? <Text style={{ color: "#6B7280" }}>Loading bank details…</Text> : null}
        {cfg?.bank_name ? <Text style={{ fontWeight: "700" }}>{cfg.bank_name}</Text> : null}
        {cfg?.bank_account_name ? <Text style={{ marginTop: 4 }}>{cfg.bank_account_name}</Text> : null}
        {cfg?.bank_account_number ? <Text style={{ marginTop: 4, fontWeight: "800", fontSize: 16 }}>{cfg.bank_account_number}</Text> : null}
        {cfg?.bank_branch ? <Text style={{ color: "#6B7280", marginTop: 2 }}>{cfg.bank_branch}</Text> : null}
        {cfg?.payment_instructions ? <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 12, lineHeight: 18 }}>{cfg.payment_instructions}</Text> : null}
        {qrUrl ? (
          <Image source={{ uri: qrUrl }} style={{ width: 180, height: 180, marginTop: 12, alignSelf: "center", borderRadius: 12 }} resizeMode="contain" />
        ) : (
          <Text style={{ marginTop: 8, textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>QR not set — ask admin to upload in Payments settings.</Text>
        )}
      </View>

      {data?.can_request_load ? (
        <View ref={formRef} collapsable={false} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
          <Text style={{ fontWeight: "800", marginBottom: 4 }}>I have paid</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 10 }}>
            Min Rs. {cfg?.min_load_rupees ?? 100} · max Rs. {cfg?.max_load_rupees ?? 50000}
          </Text>
          <TextInput
            placeholder="Amount (Rs.)"
            value={amount}
            onChangeText={setAmount}
            onFocus={focusField}
            keyboardType="number-pad"
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 16, fontWeight: "700" }}
          />
          {listingsYouGet > 0 ? (
            <View style={{ backgroundColor: "#E7F6EC", borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <Text style={{ fontWeight: "800", color: GREEN, fontSize: 13 }}>
                ≈ {listingsYouGet} live listing{listingsYouGet === 1 ? "" : "s"} at {cfg?.listing_fee_label} each
              </Text>
            </View>
          ) : null}
          <TextInput
            placeholder="Payment ID / transaction ref (optional)"
            value={paymentRef}
            onChangeText={setPaymentRef}
            onFocus={focusField}
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, marginBottom: 8 }}
          />
          <PressScale
            onPress={() => choosePhoto((uri) => setProofUri(uri), "Payment screenshot")}
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            {proofUri ? <Image source={{ uri: proofUri }} style={{ width: 48, height: 48, borderRadius: 8 }} /> : null}
            <Text style={{ fontWeight: "700", color: GREEN, flex: 1 }}>{proofUri ? "Screenshot attached — tap to change" : "Attach payment screenshot"}</Text>
          </PressScale>
          <PressScale
            onPress={() => void submitPaid()}
            style={{ backgroundColor: GREEN, paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: submitting ? 0.7 : 1 }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{submitting ? "Sending…" : "I have paid — send request"}</Text>
          </PressScale>
        </View>
      ) : (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#FFF7ED", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: "700", color: "#C2410C" }}>You already have a pending request. Wait for admin approval.</Text>
        </View>
      )}
    </>
  );
}

function ServicesBody() {
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    void fetchMyListings()
      .then((items) => setRows(items.filter((item) => item.category === "services")))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = rows.filter((row) => `${row.title} ${row.subcategory} ${row.location}`.toLowerCase().includes(q.trim().toLowerCase()) || !q.trim());
  const liveCount = rows.filter((r) => serviceListingLive(r)).length;

  async function toggleService(row: ApiListing) {
    const nextPaused = serviceListingLive(row);
    setBusyId(row.id);
    try {
      const extras = { ...row.extras, paused: nextPaused };
      const updated = await updateListing(row.id, {
        category: row.category,
        subcategory: row.subcategory,
        title: row.title,
        description: row.description,
        price: row.price,
        location: row.location,
        contact_phone: row.contact_phone,
        extras,
      });
      setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
    } catch (err) {
      Alert.alert("Could not update", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <QuickRow
        items={[
          { icon: "add-outline", label: "Add", onPress: () => navigation.navigate("Tabs", { screen: "Post" } as never) },
          { icon: "refresh-outline", label: "Refresh", onPress: load },
          { icon: "map-outline", label: "Browse", onPress: () => navigation.navigate("CategoryBrowse", { key: "services" }) },
        ]}
      />
      <StatStrip
        items={[
          { n: String(liveCount), l: "Live" },
          { n: String(rows.length - liveCount), l: "Paused" },
          { n: rows.length ? (rows.reduce((s, r) => s + (r.rating_avg || 0), 0) / rows.length).toFixed(1) : "—", l: "Rating" },
        ]}
      />
      <SearchBox value={q} onChange={setQ} placeholder="Find a service..." />
      {loading ? (
        <Text style={{ textAlign: "center", color: "#6B7280", marginTop: 24 }}>Loading your services…</Text>
      ) : list.length === 0 ? (
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", ...shadow.card }}>
          <Ionicons name="construct-outline" size={40} color={GREEN} />
          <Text style={{ fontWeight: "800", fontSize: 16, marginTop: 12 }}>No service listings yet</Text>
          <Text style={{ color: "#6B7280", textAlign: "center", marginTop: 6, lineHeight: 20 }}>
            Post plumbing, repairs, visits, and other local services buyers can book.
          </Text>
          <MiniBtn label="Post a service" fill onPress={() => navigation.navigate("Tabs", { screen: "Post" } as never)} />
        </View>
      ) : (
        list.map((row) => {
          const live = serviceListingLive(row);
          const photo = row.photos?.[0]?.url;
          return (
            <PressScale
              key={row.id}
              onPress={() => openListing(navigation, row.id, true)}
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                backgroundColor: "#fff",
                borderRadius: 18,
                padding: 14,
                borderWidth: 2,
                borderColor: live ? "#C8EBD4" : "transparent",
                ...shadow.card,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <AppImage uri={photo} style={{ width: 76, height: 76, borderRadius: 14 }} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontWeight: "800", fontSize: 15, flex: 1 }} numberOfLines={1}>{row.title}</Text>
                    <View style={{ backgroundColor: live ? "#E7F6EC" : "#F3F4F6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ color: live ? GREEN : "#6B7280", fontWeight: "800", fontSize: 10 }}>{live ? "Live" : row.status === "pending" ? "Pending" : "Paused"}</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                    {row.subcategory} · {row.location || row.city}
                  </Text>
                  <Text style={{ color: GREEN, fontWeight: "800", marginTop: 6 }}>{row.price || "Price on request"}</Text>
                </View>
                <Switch
                  value={live}
                  disabled={busyId === row.id || row.status === "pending"}
                  onValueChange={() => void toggleService(row)}
                  trackColor={{ false: "#E6E8EC", true: "#A8E0B8" }}
                  thumbColor={live ? GREEN : "#f4f3f4"}
                />
              </View>
            </PressScale>
          );
        })
      )}
    </>
  );
}

function SavedBody() {
  const navigation = useNavigation<any>();
  const map: Record<string, string> = { ss1: "sh2", ss2: "v1", ss3: "p3" };
  const [ids, setIds] = useState(sellerSaved.map((r) => r.id));
  const [filter, setFilter] = useState("All");
  const rows = sellerSaved.filter((row) => {
    if (!ids.includes(row.id)) return false;
    if (filter === "Shops") return row.title.toLowerCase().includes("shop");
    if (filter === "Vehicles") return row.title.toLowerCase().includes("creta") || row.title.toLowerCase().includes("car");
    if (filter === "Land") return row.title.toLowerCase().includes("land");
    return true;
  });

  return (
    <>
      <QuickRow
        items={[
          { icon: "eye-outline", label: "Open", onPress: () => rows[0] && openListing(navigation, map[rows[0].id] ?? "p1") },
          { icon: "swap-horizontal-outline", label: "Compare", onPress: () => Alert.alert("Compare", "Demo: stack two market ads side by side.") },
          { icon: "share-social-outline", label: "Share", onPress: () => void Share.share({ message: "Saved on NAJIK" }) },
          { icon: "trash-outline", label: "Clear", onPress: () => setIds([]) },
        ]}
      />
      <StatStrip
        items={[
          { n: String(rows.length), l: "Watching" },
          { n: "3", l: "Price drops" },
          { n: "Lahan", l: "Area" },
        ]}
      />
      <Chips items={["All", "Shops", "Vehicles", "Land"]} value={filter} onChange={setFilter} />
      {rows.length === 0 ? (
        <View style={{ margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", ...shadow.card }}>
          <Ionicons name="bookmark-outline" size={28} color={GREEN} />
          <Text style={{ fontWeight: "800", marginTop: 8 }}>Watchlist empty</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, textAlign: "center" }}>Save nearby ads to track prices.</Text>
        </View>
      ) : (
        rows.map((row) => (
          <PressScale
            key={row.id}
            onPress={() => openListing(navigation, map[row.id] ?? "p1")}
            style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 10, flexDirection: "row", ...shadow.card }}
          >
            <Image source={row.photo} style={{ width: 84, height: 84, borderRadius: 12 }} />
            <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
              <Text style={{ fontWeight: "800", fontSize: 14 }}>{row.title}</Text>
              <Text style={{ color: GREEN, fontWeight: "800", marginTop: 4 }}>{row.price}</Text>
              <Text style={{ color: "#8A8F98", fontSize: 12, marginTop: 4 }}>{row.where}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Text style={{ color: GREEN, fontSize: 11, fontWeight: "800" }}>View listing</Text>
                <Text style={{ color: "#9AA0A6", fontSize: 11 }}>· Market watch</Text>
              </View>
            </View>
            <Pressable onPress={() => setIds((p) => p.filter((id) => id !== row.id))} hitSlop={8}>
              <Ionicons name="heart" size={18} color={colors.red} />
            </Pressable>
          </PressScale>
        ))
      )}
    </>
  );
}

function KycBody() {
  const { user, refreshVerification, updateSellerProfile } = useAuth();
  const verified = isVerifiedProvider(user);
  const pending = isPendingProvider(user);
  const rejected = isRejectedProvider(user);
  const canEdit = verified || rejected;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [appStatus, setAppStatus] = useState<string>("none");
  const [docs, setDocs] = useState({
    photo: "",
    nagrita: "",
    nagritaBack: "",
    nationCard: "",
    otherDocument: "",
  });
  const [pendingUploads, setPendingUploads] = useState({
    photo: "",
    nagrita: "",
    nagritaBack: "",
    nationCard: "",
    otherDocument: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    void fetchSellerApplication()
      .then((row) => {
        if (row.status === "none") {
          setAppStatus("none");
          setDocs({ photo: "", nagrita: "", nagritaBack: "", nationCard: "", otherDocument: "" });
          return;
        }
        setAppStatus(String(row.status || user?.verification_status || "pending"));
        setDocs({
          photo: String(row.photo_uri || user?.photo_uri || ""),
          nagrita: String(row.nagrita_uri || ""),
          nagritaBack: String(row.nagrita_back_uri || ""),
          nationCard: String(row.nation_card_uri || ""),
          otherDocument: String(row.other_document_uri || ""),
        });
        setPendingUploads({ photo: "", nagrita: "", nagritaBack: "", nationCard: "", otherDocument: "" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.photo_uri, user?.verification_status]);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = verified
    ? "Verified"
    : rejected
      ? "Rejected — resubmit documents"
      : pending
        ? "Pending admin review"
        : appStatus === "none"
          ? "Not submitted"
          : "Under review";

  const statusColor = verified ? GREEN : rejected ? "#DC2626" : pending ? "#F59E0B" : "#6B7280";

  async function submitForReview() {
    if (!canEdit) {
      Alert.alert("Wait for verification", "You can update documents after admin verifies your account, or if your application was rejected.");
      return;
    }
    const hasChange = Object.values(pendingUploads).some(Boolean);
    if (!hasChange) {
      Alert.alert("No changes", "Replace a document first, then send for approval.");
      return;
    }
    setBusy(true);
    try {
      await updateSellerProfile({
        ...(pendingUploads.nagrita ? { nagrita_uri: pendingUploads.nagrita } : {}),
        ...(pendingUploads.nagritaBack ? { nagrita_back_uri: pendingUploads.nagritaBack } : {}),
        ...(pendingUploads.photo ? { photo_uri: pendingUploads.photo } : {}),
        ...(pendingUploads.nationCard ? { nation_card_uri: pendingUploads.nationCard } : {}),
        ...(pendingUploads.otherDocument ? { other_document_uri: pendingUploads.otherDocument } : {}),
      });
      await refreshVerification();
      Alert.alert(
        rejected ? "Resubmitted" : "Sent for review",
        rejected
          ? "Your updated documents were sent to admin for review."
          : "Admin will verify your document changes. Your live profile stays the same until approved.",
      );
      load();
    } catch (err) {
      Alert.alert("Could not submit", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  function pickDoc(key: keyof typeof pendingUploads, label: string) {
    if (!canEdit) {
      Alert.alert("Cannot edit yet", "Document updates are available after verification or if your application was rejected.");
      return;
    }
    choosePhoto((uri) => setPendingUploads((prev) => ({ ...prev, [key]: uri })), label);
  }

  const docRows: { key: keyof typeof docs; label: string }[] = [
    { key: "photo", label: "Profile photo" },
    { key: "nagrita", label: "Citizenship front (Nagrita)" },
    { key: "nagritaBack", label: "Citizenship back" },
    { key: "nationCard", label: "Nation card" },
    { key: "otherDocument", label: "Other document" },
  ];

  return (
    <>
      <QuickRow
        items={[
          { icon: "refresh-outline", label: "Refresh", onPress: () => void refreshVerification().then(load) },
          { icon: "document-outline", label: "Documents", onPress: () => Alert.alert("KYC", "All uploaded files are listed below.") },
          { icon: "help-circle-outline", label: "Why KYC", onPress: () => Alert.alert("KYC", "Verified sellers get more calls and can withdraw earnings.") },
        ]}
      />
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>KYC status</Text>
            <Text style={{ color: statusColor, fontWeight: "800", marginTop: 6 }}>{statusLabel}</Text>
            <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 6, lineHeight: 18 }}>
              {user?.full_name || "Account"} · {user?.service_type || "Service provider"}
            </Text>
          </View>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: verified ? "#E7F6EC" : rejected ? "#FEECEC" : "#FFF7E6", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={verified ? "shield-checkmark" : rejected ? "close-circle" : "time-outline"} size={28} color={statusColor} />
          </View>
        </View>
        {rejected && user?.rejection_note ? (
          <View style={{ marginTop: 12, backgroundColor: "#FEECEC", borderRadius: 12, padding: 10 }}>
            <Text style={{ fontWeight: "800", color: "#991B1B", fontSize: 12 }}>Admin note</Text>
            <Text style={{ color: "#7F1D1D", fontSize: 12, marginTop: 4, lineHeight: 18 }}>{user.rejection_note}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 16 }}>Uploaded documents</Text>
      {loading ? (
        <Text style={{ color: "#6B7280", marginHorizontal: 16, marginTop: 10 }}>Loading documents…</Text>
      ) : (
        docRows.map((row) => {
          const uri = pendingUploads[row.key] || docs[row.key];
          const changed = Boolean(pendingUploads[row.key]);
          return (
            <PressScale
              key={row.key}
              onPress={() => pickDoc(row.key, row.label)}
              style={{
                marginHorizontal: 16,
                marginTop: 10,
                backgroundColor: "#fff",
                borderRadius: 14,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: changed ? 2 : 0,
                borderColor: changed ? GREEN : "transparent",
                ...shadow.card,
              }}
            >
              {uri ? (
                <AuthImage uri={uri} style={{ width: 56, height: 56, borderRadius: 10 }} />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="image-outline" size={24} color={GREEN} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: "700" }}>{row.label}</Text>
                <Text style={{ color: "#9AA0A6", fontSize: 11, marginTop: 2 }}>
                  {uri ? (changed ? "New file ready to submit" : "On file with NAJIK") : "Not uploaded"}
                </Text>
              </View>
              <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{uri ? "Replace" : "Upload"}</Text>
            </PressScale>
          );
        })
      )}
      {canEdit ? (
        <PressScale
          onPress={() => void submitForReview()}
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: GREEN,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>{busy ? "Sending…" : rejected ? "Resubmit for approval" : "Send changes to admin"}</Text>
        </PressScale>
      ) : null}
    </>
  );
}

function NotesBody() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { items, unread, refresh, markAll, markRead, dismiss, dismissTarget } = useInbox();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const list = items.filter((row) => {
    const label = `${noticeSenderLabel(row)} ${row.title} ${row.body}`.toLowerCase();
    if (filter === "Unread" && row.is_read) return false;
    return label.includes(q.trim().toLowerCase()) || !q.trim();
  });

  async function openNotice(item: InboxNotice) {
    if (item.target === "chat" && item.target_id) {
      await markRead(item.id);
      openChatThread(navigation, item.target_id);
      return;
    }
    await dismiss(item.id);
    if (item.target === "listing" && item.target_id) {
      await dismissTarget({ target: "listing", target_id: item.target_id });
      openListing(navigation, item.target_id);
      return;
    }
    if (item.target === "booking" || item.kind === "booking") {
      await dismissTarget({ kind: "booking", target_id: item.target_id || undefined });
      openSellerPage(navigation, "bookings", { bookingId: item.target_id });
    }
  }

  function noticeIcon(item: InboxNotice): keyof typeof Ionicons.glyphMap {
    if (item.kind === "message") return "chatbubble-outline";
    if (item.kind === "booking") return "calendar-outline";
    if (item.kind === "listing") return "home-outline";
    return "notifications-outline";
  }

  function noticeWhen(created_at: string) {
    const d = new Date(created_at);
    if (Number.isNaN(d.getTime())) return "";
    const ms = Date.now() - d.getTime();
    const m = Math.round(ms / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return (
    <>
      <QuickRow
        items={[
          { icon: "refresh-outline", label: "Refresh", onPress: () => void refresh() },
          {
            icon: "checkmark-done-outline",
            label: "Read all",
            onPress: () => void markAll(),
          },
        ]}
      />
      <StatStrip
        items={[
          { n: String(unread), l: "Unread" },
          { n: String(items.length), l: "Total" },
          { n: isProvider(user) ? "On" : "On", l: "Alerts" },
        ]}
      />
      <SearchBox value={q} onChange={setQ} placeholder="Search alerts..." />
      <Chips items={["All", "Unread"]} value={filter} onChange={setFilter} />
      {list.length === 0 ? (
        <View style={{ margin: 16, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 40, paddingHorizontal: 20, alignItems: "center", ...shadow.card }}>
          <Ionicons name="notifications-outline" size={28} color={GREEN} />
          <Text style={{ fontWeight: "800", fontSize: 16, marginTop: 12 }}>No notifications yet</Text>
          <Text style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginTop: 6 }}>Messages, bookings, and listing alerts will appear here.</Text>
        </View>
      ) : (
        list.map((row) => {
          const unreadRow = !row.is_read;
          return (
            <PressScale
              key={row.id}
              onPress={() => void openNotice(row)}
              style={{
                marginHorizontal: 16,
                marginTop: 10,
                backgroundColor: unreadRow ? "#F3FBF5" : "#fff",
                borderRadius: 16,
                padding: 14,
                flexDirection: "row",
                ...shadow.card,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={noticeIcon(row)} size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                {row.kind === "message" ? (
                  <>
                    <Text style={{ fontWeight: "800", fontSize: 13 }}>{noticeSenderLabel(row)}</Text>
                    {row.body ? <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }} numberOfLines={2}>{row.body}</Text> : null}
                  </>
                ) : (
                  <>
                    <Text style={{ color: GREEN, fontSize: 10, fontWeight: "800" }}>{noticeKindLabel(row.kind)}</Text>
                    <Text style={{ fontWeight: "800", fontSize: 13, marginTop: 2 }}>{noticeSenderLabel(row)}</Text>
                    {row.body ? <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }} numberOfLines={2}>{row.body}</Text> : null}
                  </>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#9AA0A6", fontSize: 10 }}>{noticeWhen(row.created_at)}</Text>
                {unreadRow ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginTop: 8 }} /> : null}
              </View>
            </PressScale>
          );
        })
      )}
    </>
  );
}

function MessagesBody() {
  const navigation = useNavigation<any>();
  const { dismissTarget, refresh } = useInbox();
  return (
    <ChatInboxList
      onOpen={(id) => {
        void dismissTarget({ target: "chat", target_id: id, kind: "message" }).then(() => refresh());
        openChatThread(navigation, id);
      }}
    />
  );
}

function SettingsBody() {
  const { user, refreshVerification } = useAuth();
  const [call, setCall] = useState(Boolean(user?.allow_buyer_calls ?? true));
  const [lead, setLead] = useState(true);
  const [hide, setHide] = useState(Boolean(user?.hide_phone_on_ads ?? false));
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setCall(Boolean(user?.allow_buyer_calls ?? true));
    setHide(Boolean(user?.hide_phone_on_ads ?? false));
  }, [user?.allow_buyer_calls, user?.hide_phone_on_ads]);

  async function savePrivacy(patch: { allow_buyer_calls?: boolean; hide_phone_on_ads?: boolean }) {
    try {
      await updateProviderPrivacySettings(patch);
      await refreshVerification();
    } catch {
      Alert.alert("Settings", "Could not save phone privacy settings.");
    }
  }

  return (
    <>
      <SellerProfileEditModal visible={editOpen} onClose={() => setEditOpen(false)} />
      <QuickRow
        items={[
          { icon: "person-outline", label: "Profile", onPress: () => setEditOpen(true) },
          { icon: "lock-closed-outline", label: "Security", onPress: () => Alert.alert("Security", "PIN / biometrics in a later build.") },
          { icon: "card-outline", label: "Payouts", onPress: () => Alert.alert("Payouts", "Add eSewa or bank details.") },
          { icon: "trash-outline", label: "Delete", onPress: () => Alert.alert("Delete account", "Contact NAJIK support to close this account.") },
        ]}
      />
      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 16 }}>Account</Text>
      <View style={{ margin: 16, marginTop: 8, backgroundColor: "#fff", borderRadius: 18, padding: 6, ...shadow.card }}>
        <SettingRow icon="person-outline" title="Name" value={user?.full_name || "—"} />
        <SettingRow icon="call-outline" title="Phone" value={user?.phone || "—"} />
        <SettingRow icon="mail-outline" title="Email" value={user?.email || "—"} last />
      </View>
      <Text style={{ fontWeight: "800", marginHorizontal: 16 }}>Alerts & privacy</Text>
      <View style={{ margin: 16, marginTop: 8, backgroundColor: "#fff", borderRadius: 18, padding: 6, ...shadow.card }}>
        <ToggleRow icon="notifications-outline" title="Lead alerts" value={lead} onChange={setLead} />
        <ToggleRow
          icon="call"
          title="Allow buyer calls"
          value={call}
          onChange={(v) => {
            setCall(v);
            void savePrivacy({ allow_buyer_calls: v });
          }}
        />
        <ToggleRow
          icon="eye-off-outline"
          title="Hide number on ads"
          value={hide}
          onChange={(v) => {
            setHide(v);
            void savePrivacy({ hide_phone_on_ads: v });
          }}
        />
        <SettingRow icon="language-outline" title="Language" value="English" />
        <SettingRow icon="moon-outline" title="Appearance" value="Light" last />
      </View>
    </>
  );
}

function HelpBody() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(0);
  const list = helpFaqs.filter((row) => row.q.toLowerCase().includes(q.trim().toLowerCase()) || !q.trim());

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 }}>
        {[
          { icon: "book-outline" as const, t: "Guides" },
          { icon: "videocam-outline" as const, t: "Videos" },
          { icon: "warning-outline" as const, t: "Safety" },
          { icon: "cash-outline" as const, t: "Fees" },
        ].map((item) => (
          <PressScale key={item.t} onPress={() => Alert.alert(item.t, "Demo help article.")} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", ...shadow.card }}>
            <Ionicons name={item.icon} size={18} color={GREEN} />
            <Text style={{ fontWeight: "700", fontSize: 10, marginTop: 6 }}>{item.t}</Text>
          </PressScale>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 }}>
        <PressScale
          onPress={() => Alert.alert("Call NAJIK", "Use the email on this screen or your staff contact.")}
          style={{ flex: 1, backgroundColor: GREEN, borderRadius: 14, padding: 14, alignItems: "center" }}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", marginTop: 6 }}>Call NAJIK</Text>
        </PressScale>
        <PressScale
          onPress={() => Alert.alert("Chat support", "Help is available from the NAJIK team during business hours.")}
          style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", ...shadow.card }}
        >
          <Ionicons name="chatbubbles" size={18} color={GREEN} />
          <Text style={{ color: GREEN, fontWeight: "800", marginTop: 6 }}>Live chat</Text>
        </PressScale>
      </View>
      <SearchBox value={q} onChange={setQ} placeholder="Search FAQs..." />
      {list.map((faq, i) => (
        <Pressable
          key={faq.q}
          onPress={() => setOpen(open === i ? -1 : i)}
          style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 14, padding: 14, ...shadow.card }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 13, paddingRight: 8 }}>{faq.q}</Text>
            <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={16} color="#9AA0A6" />
          </View>
          {open === i ? <Text style={{ color: "#4B5563", fontSize: 13, lineHeight: 20, marginTop: 8 }}>{faq.a}</Text> : null}
        </Pressable>
      ))}
    </>
  );
}

function StatStrip({ items }: { items: { n: string; l: string }[] }) {
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 14, gap: 8 }}>
      {items.map((item) => (
        <View key={item.l} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, ...shadow.card }}>
          <Text style={{ fontWeight: "800", fontSize: 18, color: GREEN }}>{item.n}</Text>
          <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>{item.l}</Text>
        </View>
      ))}
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { fg: string; bg: string }> = {
    Upcoming: { fg: "#2563EB", bg: "#E8F1FE" },
    Confirmed: { fg: GREEN, bg: "#E7F6EC" },
    Completed: { fg: "#6B7280", bg: "#F3F4F6" },
    Cancelled: { fg: colors.red, bg: "#FDECEC" },
  };
  const t = map[status] ?? map.Completed;
  return (
    <View style={{ backgroundColor: t.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
      <Text style={{ color: t.fg, fontSize: 10, fontWeight: "800" }}>{status}</Text>
    </View>
  );
}

function MiniBtn({ label, onPress, fill, danger }: { label: string; onPress: () => void; fill?: boolean; danger?: boolean }) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        marginTop: fill || danger ? 10 : 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: fill ? GREEN : danger ? "#FDECEC" : "#F3F4F6",
        alignItems: "center",
        flex: 1,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 12, color: fill ? "#fff" : danger ? colors.red : "#374151" }}>{label}</Text>
    </PressScale>
  );
}

function SettingRow({ icon, title, value, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string; last?: boolean }) {
  return (
    <PressScale
      onPress={() => Alert.alert(title, value)}
      style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: "#F0F1F3" }}
    >
      <Ionicons name={icon} size={18} color={GREEN} />
      <Text style={{ flex: 1, marginLeft: 10, fontWeight: "700", color: "#111827" }}>{title}</Text>
      <Text style={{ color: "#6B7280", fontSize: 12, marginRight: 6 }}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color="#C4C7CC" />
    </PressScale>
  );
}

function ToggleRow({
  icon,
  title,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F0F1F3" }}>
      <Ionicons name={icon} size={18} color={GREEN} />
      <Text style={{ flex: 1, marginLeft: 10, fontWeight: "700", color: "#111827" }}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#E6E8EC", true: "#A8E0B8" }} thumbColor={value ? GREEN : "#f4f3f4"} />
    </View>
  );
}
