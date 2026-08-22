import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { Image, Text, View } from "react-native";
import { AuthImage } from "./AuthImage";
import { NajikWordmark } from "./NajikWordmark";

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

/** Top-right corner accent flush with card edges (SS2). Parent overflow clips to radius. */
function TopRightCorner({ width }: { width: number }) {
  const h = Math.round(width * 0.52);
  return (
    <Svg
      width={width + 2}
      height={h + 2}
      viewBox="0 0 140 72"
      style={{ position: "absolute", top: -1, right: -1, zIndex: 1 }}
      pointerEvents="none"
    >
      <Path d="M0 0 C48 6 92 34 140 72 L140 66 C96 32 52 4 0 0 Z" fill={GREEN_LIGHT} />
      <Path d="M0 0 H140 V72 C92 34 48 6 0 0 Z" fill={GREEN} />
    </Svg>
  );
}

/** Bottom wave matching SS2: high on left, swoops down to right, light lip on top edge. */
function BottomWave({ width, height }: { width: number; height: number }) {
  const w = width;
  const h = height;
  const main = `M0 ${h} V ${h * 0.08} C ${w * 0.22} ${h * -0.02} ${w * 0.42} ${h * 0.55} ${w * 0.62} ${h * 0.72} C ${w * 0.78} ${h * 0.86} ${w * 0.9} ${h * 0.92} ${w} ${h * 0.95} V ${h} Z`;
  const lip = `M0 ${h * 0.08} C ${w * 0.22} ${h * -0.02} ${w * 0.42} ${h * 0.55} ${w * 0.62} ${h * 0.72} C ${w * 0.78} ${h * 0.86} ${w * 0.9} ${h * 0.92} ${w} ${h * 0.95} L ${w} ${h * 0.88} C ${w * 0.9} ${h * 0.85} ${w * 0.78} ${h * 0.78} ${w * 0.62} ${h * 0.64} C ${w * 0.42} ${h * 0.46} ${w * 0.22} ${h * -0.08} 0 ${h * 0.02} Z`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, bottom: 0 }}>
      <Path d={lip} fill={GREEN_LIGHT} />
      <Path d={main} fill={GREEN} />
    </Svg>
  );
}

/** Public branding image — no auth header needed; URI already includes ?v= cache bust. */
function SignatureImage({ uri, style }: { uri?: string | null; style: object }) {
  if (uri) {
    return <Image key={uri} source={{ uri }} style={style} resizeMode="contain" />;
  }
  return <Image source={DEFAULT_SIGN} style={style} resizeMode="contain" />;
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
  membership_fee_label?: string;
  branding_updated_at?: string | null;
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
  const footerH = 128;
  const cornerW = Math.round(width * 0.42);

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
      {/* Top-right brand corner — flush to card edges (SS2). */}
      <TopRightCorner width={cornerW} />

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

      <View style={{ paddingTop: 16, paddingHorizontal: 18, alignItems: "center", zIndex: 2 }}>
        <NajikWordmark scale={0.72} />
        <View style={{ marginTop: 14 }}>
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

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2, zIndex: 2 }}>
        <DetailRow icon="person" label="Provider ID" value={card.card_code} />
        <DetailRow icon="briefcase" label="Category" value={card.category || "—"} />
        <DetailRow icon="call" label="Phone" value={formatPhone(card.phone)} />
        <DetailRow icon="mail" label="Email" value={card.email || "—"} />
        {card.membership_fee_label ? (
          <DetailRow icon="cash" label="Plan fee" value={card.membership_fee_label} />
        ) : null}
        <DetailRow icon="calendar" label="Joined On" value={formatJoined(card.joined_on)} />
      </View>

      {/* Footer: QR in green (left), signature in white (right) — SS2. */}
      <View style={{ height: footerH, marginTop: 8 }}>
        <BottomWave width={width} height={footerH} />

        <View style={{ position: "absolute", left: 14, bottom: 16, zIndex: 3 }}>
          <View
            style={{
              width: 74,
              height: 74,
              borderRadius: 10,
              backgroundColor: "#fff",
              padding: 5,
              overflow: "hidden",
            }}
          >
            {qr ? <AuthImage uri={qr} style={{ width: "100%", height: "100%" }} resizeMode="contain" /> : null}
          </View>
        </View>

        <View
          style={{
            position: "absolute",
            right: 16,
            top: 8,
            zIndex: 4,
            alignItems: "center",
            minWidth: 124,
          }}
        >
          <SignatureImage uri={card.signature_uri} style={{ width: 120, height: 42 }} />
          <View style={{ width: 112, height: 1.5, backgroundColor: GREEN, marginTop: 2, marginBottom: 3 }} />
          <Text style={{ fontSize: 10, fontWeight: "600", color: "#111" }}>Authorized Signatory</Text>
        </View>
      </View>
    </View>
  );
}
