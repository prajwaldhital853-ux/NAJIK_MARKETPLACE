import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { fetchSellerPaymentsMe, type SellerPaymentsMe } from "../paymentsApi";
import { fetchReferEarnMe, type ReferEarnMe } from "../referralsApi";
import { colors, shadow } from "../theme";

const GREEN = colors.greenDeep;

function ScreenShell({ title, children, loading, onRefresh }: { title: string; children: ReactNode; loading?: boolean; onRefresh?: () => void }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const refreshControl = useAppRefreshControl(onRefresh);

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={{ fontWeight: "800", fontSize: 16, flex: 1, color: "#111827" }}>{title}</Text>
        </View>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={GREEN} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }} refreshControl={onRefresh ? refreshControl : undefined}>
          {children}
        </ScrollView>
      )}
    </View>
  );
}

export function BuyerWalletScreen() {
  const [data, setData] = useState<SellerPaymentsMe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    void fetchSellerPaymentsMe()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const txs = data?.transactions ?? [];

  return (
    <ScreenShell title="My Wallet" loading={loading} onRefresh={load}>
      <View style={{ backgroundColor: GREEN, borderRadius: 18, padding: 18, ...shadow.card }}>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700" }}>WALLET BALANCE</Text>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 4 }}>{data?.balance_label || "Rs. 0.00"}</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 8 }}>
          Loaded {data?.loaded_balance_label || "Rs. 0.00"}
        </Text>
      </View>
      <Text style={{ fontWeight: "800", fontSize: 15, color: "#111827", marginTop: 22, marginBottom: 10 }}>Recent activity</Text>
      {txs.length ? (
        txs.slice(0, 20).map((row) => (
          <View key={row.id} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, ...shadow.card }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700", color: "#111827", flex: 1 }}>{row.kind_label || row.kind}</Text>
              <Text style={{ fontWeight: "800", color: row.amount_paisa >= 0 ? GREEN : colors.red }}>{row.amount_label}</Text>
            </View>
            <Text style={{ color: "#8A8F98", fontSize: 11, marginTop: 4 }}>{new Date(row.created_at).toLocaleString()}</Text>
          </View>
        ))
      ) : (
        <Text style={{ color: "#6B7280", textAlign: "center", marginTop: 12 }}>No wallet transactions yet.</Text>
      )}
    </ScreenShell>
  );
}

export function BuyerCoinsScreen() {
  const [data, setData] = useState<ReferEarnMe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    void fetchReferEarnMe()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const stats = data?.stats;

  return (
    <ScreenShell title="NAJIK Coins" loading={loading} onRefresh={load}>
      <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 18, ...shadow.card }}>
        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "700" }}>AVAILABLE COINS</Text>
        <Text style={{ color: GREEN, fontSize: 28, fontWeight: "900", marginTop: 6 }}>
          {stats?.available_total_label || stats?.earned_total_label || "Rs. 0"}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 8 }}>
          Coins come from completed referrals. Invite friends from Invite & Earn to grow this balance.
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, ...shadow.card }}>
          <Text style={{ fontWeight: "800", fontSize: 18, color: GREEN }}>{stats?.joined ?? 0}</Text>
          <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>Friends joined</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, ...shadow.card }}>
          <Text style={{ fontWeight: "800", fontSize: 18, color: GREEN }}>{stats?.earned_count ?? 0}</Text>
          <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>Rewards earned</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

export function BuyerCouponsScreen() {
  return (
    <ScreenShell title="My Coupons">
      <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 22, alignItems: "center", ...shadow.card }}>
        <Ionicons name="pricetag-outline" size={36} color={GREEN} />
        <Text style={{ fontWeight: "800", fontSize: 16, marginTop: 12, color: "#111827" }}>No coupons yet</Text>
        <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 6, textAlign: "center" }}>
          Promo coupons will show here when NAJIK adds a campaign for your account.
        </Text>
      </View>
    </ScreenShell>
  );
}

export function BuyerTransactionsScreen() {
  const [data, setData] = useState<SellerPaymentsMe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    void fetchSellerPaymentsMe()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const txs = data?.transactions ?? [];

  return (
    <ScreenShell title="Transaction History" loading={loading} onRefresh={load}>
      {txs.length ? (
        txs.map((row) => (
          <View key={row.id} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, ...shadow.card }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700", color: "#111827", flex: 1 }}>{row.kind_label || row.kind}</Text>
              <Text style={{ fontWeight: "800", color: row.amount_paisa >= 0 ? GREEN : colors.red }}>{row.amount_label}</Text>
            </View>
            {row.note ? <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>{row.note}</Text> : null}
            <Text style={{ color: "#8A8F98", fontSize: 11, marginTop: 4 }}>{new Date(row.created_at).toLocaleString()}</Text>
          </View>
        ))
      ) : (
        <Text style={{ color: "#6B7280", textAlign: "center", marginTop: 24 }}>No transactions yet.</Text>
      )}
    </ScreenShell>
  );
}
