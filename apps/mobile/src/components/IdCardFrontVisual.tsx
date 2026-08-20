import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { Image, Text, View } from "react-native";
import { AuthImage } from "./AuthImage";
import { NajikWordmark } from "./NajikWordmark";
import { colors } from "../theme";

const GREEN = "#1B7D2C";
const GREEN_LIGHT = "#7AC943";

const DEFAULT_SIGN = require("../../assets/id-card/authorized-signatory.png");

function formatJoined(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatPhone(phone?: string) {
  if (!phone) return "—";
  return phone.startsWith("+") ? phone : `+977 ${phone}`;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#E8ECF0",
        gap: 8,
      }}
    >
      <Ionicons name={icon} size={16} color={GREEN} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#111827", minWidth: 86 }}>{label}:</Text>
      <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: "#111827", textAlign: "left" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TopCurve({ width }: { width: number }) {
  return (
    <Svg width={width} height={78} style={{ position: "absolute", top: 0, right: 0 }} viewBox={`0 0 ${width} 78`}>
      <Path d={`M ${width * 0.42} 0 H ${width} V 62 C ${width * 0.82} 78 ${width * 0.58} 70 ${width * 0.42} 0 Z`} fill={GREEN} />
    </Svg>
  );
}

function BottomWave({ width }: { width: number }) {
  const h = 108;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ position: "absolute", left: 0, bottom: 0 }}>
      <Path
        d={`M0 ${h} V 48 C ${width * 0.18} 18 ${width * 0.38} 72 ${width * 0.58} 46 C ${width * 0.78} 22 ${width * 0.9} 38 ${width} 28 V ${h} Z`}
        fill={GREEN}
      />
      <Path
        d={`M0 ${h} V 62 C ${width * 0.2} 36 ${width * 0.4} 78 ${width * 0.6} 54 C ${width * 0.78} 34 ${width * 0.9} 48 ${width} 42 V ${h} Z`}
        fill={GREEN_LIGHT}
      />
    </Svg>
  );
}

export type IdCardFrontData = {
  full_name: string;
  card_code: string;
  category?: string;
  phone?: string;
  email?: string;
  joined_on?: string | null;
  photo_uri?: string | null;
  qr_uri?: string | null;
  public_qr_uri?: string | null;
  signature_uri?: string | null;
};

export function IdCardFrontVisual({
  card,
  width,
  watermark,
}: {
  card: IdCardFrontData;
  width: number;
  watermark?: boolean;
}) {
  const qr = card.qr_uri || card.public_qr_uri;

  return (
    <View
      style={{
        width,
        backgroundColor: "#fff",
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#D7E3DB",
      }}
    >
      <TopCurve width={width} />
      {watermark ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 30 }}>
          {Array.from({ length: 8 }).map((_, row) => (
            <Text
              key={row}
              style={{
                position: "absolute",
                top: 28 + row * 52,
                left: -20,
                width: width * 1.6,
                transform: [{ rotate: "-28deg" }],
                fontSize: 16,
                fontWeight: "900",
                color: "rgba(185, 28, 28, 0.2)",
                letterSpacing: 2,
              }}
            >
              DOWNLOAD BLOCKED · DOWNLOAD BLOCKED · DOWNLOAD BLOCKED
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ paddingTop: 18, paddingHorizontal: 18, alignItems: "center", zIndex: 2 }}>
        <NajikWordmark scale={0.52} />
        <View style={{ marginTop: 12 }}>
          {card.photo_uri ? (
            <AuthImage
              uri={card.photo_uri}
              style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: GREEN }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 112,
                height: 112,
                borderRadius: 56,
                backgroundColor: "#E7F6EC",
                borderWidth: 3,
                borderColor: GREEN,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={42} color={GREEN} />
            </View>
          )}
        </View>
        <Text style={{ marginTop: 12, fontSize: 18, fontWeight: "900", color: "#111", letterSpacing: 0.5 }}>
          {(card.full_name || "SELLER").toUpperCase()}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, fontWeight: "800", color: GREEN }}>SERVICE PROVIDER</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, zIndex: 2 }}>
        <DetailRow icon="person" label="Provider ID" value={card.card_code} />
        <DetailRow icon="briefcase" label="Category" value={card.category || "—"} />
        <DetailRow icon="call" label="Phone" value={formatPhone(card.phone)} />
        <DetailRow icon="mail" label="Email" value={card.email || "—"} />
        <DetailRow icon="calendar" label="Joined On" value={formatJoined(card.joined_on)} />
      </View>

      <View style={{ height: 118, marginTop: 4, justifyContent: "flex-end" }}>
        <BottomWave width={width} />
        <View
          style={{
            zIndex: 3,
            paddingHorizontal: 16,
            paddingBottom: 14,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 68, height: 68, borderRadius: 8, backgroundColor: "#fff", padding: 4, overflow: "hidden" }}>
            {qr ? <AuthImage uri={qr} style={{ width: "100%", height: "100%" }} resizeMode="contain" /> : null}
          </View>
          <View style={{ alignItems: "center", minWidth: 110 }}>
            {card.signature_uri ? (
              <AuthImage uri={card.signature_uri} style={{ width: 110, height: 36 }} resizeMode="contain" />
            ) : (
              <Image source={DEFAULT_SIGN} style={{ width: 110, height: 36 }} resizeMode="contain" />
            )}
            <View style={{ width: 108, height: 1.5, backgroundColor: GREEN, marginTop: 2, marginBottom: 3 }} />
            <Text style={{ fontSize: 10, fontWeight: "600", color: "#111" }}>Authorized Signatory</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
