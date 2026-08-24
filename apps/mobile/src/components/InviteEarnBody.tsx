import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useCallback, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { friendlyError } from "../api";
import { fetchReferEarnMe } from "../referralsApi";
import { shadow } from "../theme";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";

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

export function InviteEarnBody({ audience = "provider" }: { audience?: "provider" | "user" }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchReferEarnMe>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const isBuyer = audience === "user";

  const reload = useCallback(() => {
    setLoading(true);
    void fetchReferEarnMe()
      .then((payload) => {
        setData(payload);
        setError("");
      })
      .catch((err) => {
        setData(null);
        setError(friendlyError(err, "Could not load your invite code. Pull to refresh or try again."));
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const code = data?.invite_code || "—";
  const reward = data?.reward_label ?? "Rs. 200";
  const stats = data?.stats;
  const friends = data?.recent || [];
  const steps = data?.how_it_works ?? [];

  async function copyCode() {
    if (!code || code === "—") return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!code || code === "—") return;
    const message = isBuyer
      ? `Join NAJIK as a buyer. My one-time invite code: ${code}\n\nEnter this when you register. Each code works for one person only.`
      : `Join NAJIK as a service provider on NAJIK. My one-time invite code: ${code}\n\nEnter this when you register. Each code works for one person only.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    void Linking.openURL(url).catch(() => void Share.share({ message }));
  }

  const pendingHint = isBuyer
    ? "If reward is not in Payments yet, read the status line — most often they still need to verify their phone."
    : "If reward is not in Payments yet, read the status line — most often they still need to publish their first live listing.";

  return (
    <>
      <PressScale
        onPress={() => setHowOpen(true)}
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: "#E8F1FE",
        }}
      >
        <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
        <Text style={{ color: "#2563EB", fontWeight: "800", fontSize: 12 }}>See how this works</Text>
      </PressScale>

      <Modal visible={howOpen} transparent animationType="fade" onRequestClose={() => setHowOpen(false)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
          <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setHowOpen(false)} />
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, maxHeight: "78%", ...shadow.card }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ flex: 1, fontWeight: "800", fontSize: 17, color: "#111827" }}>How Refer & Earn works</Text>
              <Pressable onPress={() => setHowOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: "#4B5563", fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
                You earn <Text style={{ fontWeight: "800" }}>{reward}</Text> in Payments when a friend completes all steps. Each code works for{" "}
                <Text style={{ fontWeight: "800" }}>one friend only</Text> — a new code is generated after someone joins.
              </Text>
              {steps.map((step) => (
                <View key={step.step} style={{ flexDirection: "row", marginBottom: 12, gap: 10 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>{step.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", fontSize: 13, color: "#111827" }}>{step.title}</Text>
                    <Text style={{ color: "#6B7280", fontSize: 12, lineHeight: 18, marginTop: 3 }}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatStrip
        items={[
          { n: String(stats?.invites_sent ?? 0), l: "Invites used" },
          { n: stats?.available_total_label ?? stats?.earned_total_label ?? "Rs. 0", l: "Available now" },
          { n: stats?.wallet_total_label ?? "Rs. 0", l: "Wallet total" },
        ]}
      />

      {!loading && error ? (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#FECACA" }}>
          <Text style={{ color: "#B91C1C", fontWeight: "700", fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, ...shadow.card }}>
        <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 12 }}>Your active invite code (one-time)</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <Text style={{ flex: 1, fontSize: 20, fontWeight: "800", letterSpacing: 0.5 }} selectable>
            {loading ? "…" : code}
          </Text>
          <PressScale onPress={() => void copyCode()} style={{ backgroundColor: copied ? "#E7F6EC" : GREEN, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
            <Text style={{ color: copied ? GREEN : "#fff", fontWeight: "800", fontSize: 12 }}>{copied ? "Copied!" : "Copy"}</Text>
          </PressScale>
        </View>
        <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 12, lineHeight: 18 }}>
          {data?.description || "Share this code. After one friend registers with it, this code stops working and a new one is generated here."}
        </Text>

        {!loading && code !== "—" ? (
          <PressScale
            onPress={() => setShowQr((v) => !v)}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: showQr ? "#2563EB" : "#E5E7EB",
              backgroundColor: showQr ? "#E8F1FE" : "#F9FAFB",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color="#2563EB" />
            <Text style={{ color: "#2563EB", fontWeight: "800", fontSize: 13 }}>{showQr ? "Hide QR code" : "Show QR code"}</Text>
          </PressScale>
        ) : null}

        {!loading && code !== "—" && showQr ? (
          <View style={{ alignItems: "center", marginTop: 12, paddingVertical: 12, backgroundColor: "#F9FAFB", borderRadius: 14 }}>
            <QRCode value={code} size={160} backgroundColor="#F9FAFB" color="#111827" />
            <Text style={{ marginTop: 8, fontSize: 11, color: "#6B7280", textAlign: "center", paddingHorizontal: 12 }}>
              Scan to read the invite code · share via WhatsApp below
            </Text>
            <Text style={{ marginTop: 4, fontWeight: "800", fontSize: 13, color: "#111827" }} selectable>
              {code}
            </Text>
          </View>
        ) : null}
      </View>

      <QuickRow
        items={[
          { icon: "copy-outline", label: copied ? "Copied" : "Copy", onPress: () => void copyCode() },
          { icon: "logo-whatsapp", label: "WhatsApp", onPress: shareWhatsApp },
        ]}
      />

      <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 18 }}>People who used your codes</Text>
      <Text style={{ color: "#6B7280", marginHorizontal: 16, marginTop: 4, fontSize: 12, lineHeight: 18 }}>{pendingHint}</Text>
      {!loading && friends.length === 0 ? (
        <Text style={{ color: "#6B7280", marginHorizontal: 16, marginTop: 10, fontSize: 13 }}>No invites yet — share your code to start earning.</Text>
      ) : friends.length > 0 ? (
        <ScrollView
          style={{ maxHeight: friends.length > 3 ? 320 : undefined, marginTop: 8 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={friends.length > 3}
        >
          {friends.map((row) => (
            <View key={row.id} style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 14, padding: 12, ...shadow.card }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: row.status === "earned" ? "#E7F6EC" : "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontWeight: "800", color: row.status === "earned" ? GREEN : "#6B7280" }}>{row.name[0] || "?"}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontWeight: "800", fontSize: 13 }}>{row.name}</Text>
                    <Text style={{ color: row.status === "earned" ? GREEN : "#9CA3AF", fontWeight: "800", fontSize: 12 }}>
                      {row.status === "earned" ? row.reward_label : "Pending"}
                    </Text>
                  </View>
                  <Text style={{ color: row.status === "earned" ? GREEN : "#6B7280", fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                    {row.status_detail || (row.status === "earned" ? "Reward credited." : "Waiting for friend to complete steps.")}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </>
  );
}
