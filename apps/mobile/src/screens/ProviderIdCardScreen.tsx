import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Text,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { AuthImage } from "../components/AuthImage";
import { IdCardFrontVisual } from "../components/IdCardFrontVisual";
import { PressScale } from "../components/PressScale";
import {
  downloadMyIdCardPdf,
  fetchMyIdCard,
  requestIdCardDownload,
  shareIdCardPdf,
  type ProviderIdCard,
} from "../idCardApi";
import { friendlyError } from "../api";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const CARD_W = Math.min(Dimensions.get("window").width - 32, 360);

const TERMS = [
  "This ID card is the property of NAJIK.",
  "This card is non-transferable.",
  "Use of this ID card is subject to NAJIK’s terms and conditions.",
  "If found, please return to NAJIK office or contact us.",
];

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

function SectionPill({ label }: { label: string }) {
  return (
    <View style={{ alignSelf: "center", backgroundColor: GREEN, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 10, letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
}

function BackCard({ card, blocked }: { card: ProviderIdCard; blocked: boolean }) {
  const phone = card.emergency_phone || "01-5970123";
  const email = card.emergency_email || "support@najik.com";
  const website = (card.website || "www.najik.com").replace(/^https?:\/\//, "");
  const qr = card.public_qr_uri || card.qr_uri;

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

      <View style={{ backgroundColor: GREEN, paddingTop: 18, paddingBottom: 34, alignItems: "center", position: "relative" }}>
        <Image
          source={require("../../assets/id-card/back-brand.png")}
          style={{ width: 200, height: 100 }}
          resizeMode="contain"
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 22,
            backgroundColor: "#fff",
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 }}>
        <SectionPill label="TERMS & CONDITIONS" />
        <View style={{ marginTop: 12, gap: 8 }}>
          {TERMS.map((line) => (
            <View key={line} style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN, marginTop: 5 }} />
              <Text style={{ flex: 1, color: "#1F2937", fontSize: 11, lineHeight: 15 }}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 1, backgroundColor: GREEN, marginVertical: 14 }} />

        <SectionPill label="EMERGENCY CONTACT" />
        <View style={{ marginTop: 12, gap: 8, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="call" size={14} color={GREEN} />
            <Text style={{ color: "#111", fontWeight: "700", fontSize: 12 }}>{phone}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="mail" size={14} color={GREEN} />
            <Text style={{ color: "#111", fontWeight: "700", fontSize: 12 }}>{email}</Text>
          </View>
        </View>

        <View style={{ alignItems: "center", marginTop: 18 }}>
          <Text style={{ color: GREEN, fontWeight: "900", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
            SCAN TO VERIFY
          </Text>
          {qr ? (
            <View
              style={{
                width: 132,
                height: 132,
                borderRadius: 12,
                borderWidth: 2.5,
                borderColor: GREEN,
                backgroundColor: "#fff",
                padding: 6,
                overflow: "hidden",
              }}
            >
              <AuthImage uri={qr} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: GREEN,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
            </View>
            <View>
              <Text style={{ color: GREEN, fontWeight: "900", fontSize: 13 }}>
                {card.is_verified ? "VERIFIED" : "PENDING"}
              </Text>
              <Text style={{ color: "#111", fontWeight: "600", fontSize: 11 }}>Valid ID</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: GREEN, marginTop: 16, paddingTop: 22, paddingBottom: 14, alignItems: "center", position: "relative" }}>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -1,
            height: 22,
            backgroundColor: "#fff",
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="globe-outline" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{website}</Text>
        </View>
      </View>
    </View>
  );
}

export function ProviderIdCardScreen() {
  const navigation = useNavigation<any>();
  const [card, setCard] = useState<ProviderIdCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
    if (downloading) return;
    setDownloading(true);
    try {
      const uri = await downloadMyIdCardPdf(card.card_code);
      await shareIdCardPdf(uri);
    } catch (err) {
      Alert.alert("Download failed", friendlyError(err, "Could not download the ID card PDF."));
    } finally {
      setDownloading(false);
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
                  disabled={downloading || !card.can_download}
                  style={{
                    height: 50,
                    borderRadius: 14,
                    backgroundColor: card.can_download ? GREEN : "#CBD5E1",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 10,
                    opacity: downloading ? 0.85 : 1,
                  }}
                >
                  {downloading ? <ActivityIndicator color="#fff" size="small" /> : null}
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    {downloading
                      ? "Downloading…"
                      : card.can_download
                        ? "Download / Print"
                        : "Download / Print (locked)"}
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
