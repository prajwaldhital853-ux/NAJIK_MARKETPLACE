import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { AppHeader } from "../components/AppHeader";
import { AuthImage } from "../components/AuthImage";
import { IdCardFrontVisual } from "../components/IdCardFrontVisual";
import { PressScale } from "../components/PressScale";
import { fetchMyIdCard, requestIdCardDownload, type ProviderIdCard } from "../idCardApi";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const CARD_W = Math.min(Dimensions.get("window").width - 32, 360);

function Watermark({ label }: { label: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        overflow: "hidden",
        zIndex: 20,
      }}
    >
      {Array.from({ length: 8 }).map((_, row) => (
        <Text
          key={row}
          style={{
            position: "absolute",
            top: 28 + row * 52,
            left: -20,
            width: CARD_W * 1.6,
            transform: [{ rotate: "-28deg" }],
            fontSize: 18,
            fontWeight: "900",
            color: "rgba(185, 28, 28, 0.22)",
            letterSpacing: 2,
          }}
        >
          {`${label}  ·  ${label}  ·  ${label}  ·  ${label}`}
        </Text>
      ))}
    </View>
  );
}

function BackCard({ card, blocked }: { card: ProviderIdCard; blocked: boolean }) {
  return (
    <View
      style={{
        width: CARD_W,
        alignSelf: "center",
        backgroundColor: "#fff",
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#D7E3DB",
        marginTop: 16,
        ...shadow.card,
      }}
    >
      {blocked ? <Watermark label="DOWNLOAD BLOCKED" /> : null}
      <View style={{ backgroundColor: GREEN, paddingVertical: 28, alignItems: "center" }}>
        <Image source={require("../../assets/logo.png")} style={{ width: 52, height: 44 }} resizeMode="contain" />
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20, marginTop: 8, letterSpacing: 1 }}>NAJIK</Text>
        <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 10, marginTop: 4, letterSpacing: 1.2 }}>EVERYTHING NEAR YOU</Text>
      </View>

      <View style={{ margin: 14, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#D7E3DB" }}>
        <View style={{ backgroundColor: GREEN, paddingVertical: 8, paddingHorizontal: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>TERMS & CONDITIONS</Text>
        </View>
        <View style={{ padding: 10 }}>
          <Text style={{ color: "#334155", fontSize: 11, lineHeight: 16 }}>
            • This ID is property of NAJIK.{"\n"}
            • Non-transferable. Misuse may lead to account suspension.{"\n"}
            • Follow NAJIK marketplace terms at all times.{"\n"}
            • Return or destroy if your account is closed.
          </Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 14, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#D7E3DB" }}>
        <View style={{ backgroundColor: GREEN, paddingVertical: 8, paddingHorizontal: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>EMERGENCY CONTACT</Text>
        </View>
        <View style={{ padding: 10, gap: 6 }}>
          <Text style={{ color: "#334155", fontSize: 12 }}>01-5970123</Text>
          <Text style={{ color: "#334155", fontSize: 12 }}>support@najik.com</Text>
        </View>
      </View>

      <View style={{ alignItems: "center", paddingVertical: 16 }}>
        <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12, marginBottom: 10 }}>SCAN TO VERIFY</Text>
        {card.public_qr_uri || card.qr_uri ? (
          <AuthImage
            uri={card.public_qr_uri || card.qr_uri || undefined}
            style={{ width: 132, height: 132, borderRadius: 10, borderWidth: 2, borderColor: GREEN, backgroundColor: "#fff" }}
            resizeMode="contain"
          />
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
          <Ionicons name="shield-checkmark" size={18} color={GREEN} />
          <Text style={{ color: GREEN, fontWeight: "900" }}>{card.is_verified ? "VERIFIED" : "PENDING"} · Valid ID</Text>
        </View>
      </View>

      <View style={{ backgroundColor: GREEN, paddingVertical: 12, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>www.najik.com</Text>
      </View>
    </View>
  );
}

export function ProviderIdCardScreen() {
  const navigation = useNavigation<any>();
  const [card, setCard] = useState<ProviderIdCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setCard(await fetchMyIdCard());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ID card.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blocked = !card?.can_download;
  const requested = card?.access_status === "requested";

  async function requestAccess() {
    setBusy(true);
    try {
      setCard(await requestIdCardDownload());
      Alert.alert("Request sent", "Admin will review your download / print request from the admin panel.");
    } catch (err) {
      Alert.alert("Request failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadOrPrint() {
    if (!card?.can_download) {
      Alert.alert(
        "Download blocked",
        "Your ID card is visible, but download and print stay locked until admin approves. Send a request first.",
      );
      return;
    }
    setBusy(true);
    try {
      await Share.share({
        message: `NAJIK Service Provider ID\n${card.full_name}\nID: ${card.card_code}\nCategory: ${card.category || "—"}\nVerify: ${card.verify_url}`,
        title: "NAJIK ID Card",
      });
      await WebBrowser.openBrowserAsync(card.verify_url);
    } catch (err) {
      Alert.alert("Share failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
      <AppHeader right="bell" onClose={() => navigation.goBack()} />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={GREEN} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: colors.navy }}>My ID Card</Text>
          <Text style={{ marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            Auto-generated with your unique provider ID. Download and print unlock only after admin approval.
          </Text>

          {error ? <Text style={{ marginTop: 10, color: colors.red, fontWeight: "700" }}>{error}</Text> : null}

          {card ? (
            <>
              <View
                style={{
                  marginTop: 14,
                  marginBottom: 12,
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: blocked ? "#FEF2F2" : "#E7F6EC",
                }}
              >
                <Text style={{ fontWeight: "800", color: colors.navy }}>
                  {card.can_download ? "Download / print approved" : requested ? "Approval requested" : "Download / print blocked"}
                </Text>
                <Text style={{ marginTop: 4, color: colors.muted, fontSize: 12 }}>
                  {card.can_download
                    ? "You can print or share a clean copy of this card."
                    : "Screenshots of this blocked card include a watermark. Request access below."}
                </Text>
              </View>

              <View style={{ alignSelf: "center", ...shadow.card, borderRadius: 22 }}>
                <IdCardFrontVisual card={card} width={CARD_W} watermark={blocked} />
              </View>
              <BackCard card={card} blocked={blocked} />

              <View style={{ marginTop: 18, gap: 10 }}>
                {!card.can_download ? (
                  <PressScale
                    onPress={() => void requestAccess()}
                    style={{
                      height: 50,
                      borderRadius: 14,
                      backgroundColor: requested ? "#94A3B8" : GREEN,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800" }}>
                      {busy ? "Sending…" : requested ? "Request pending" : "Request download / print approval"}
                    </Text>
                  </PressScale>
                ) : null}

                <PressScale
                  onPress={() => void downloadOrPrint()}
                  style={{
                    height: 50,
                    borderRadius: 14,
                    backgroundColor: card.can_download ? GREEN : "#CBD5E1",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    {card.can_download ? "Download / Print" : "Download / Print (locked)"}
                  </Text>
                </PressScale>
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
