import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Linking, Text, View } from "react-native";

type Ion = ComponentProps<typeof Ionicons>["name"];
import { Avatar } from "./Avatar";
import { PressScale } from "./PressScale";

const BLUE = "#2563EB";
const LINE = "#E5E7EB";

function maskEmail(email?: string | null) {
  const value = (email || "").trim();
  if (!value.includes("@")) return "";
  const [local, domain] = value.split("@");
  const keep = local.slice(0, 2) || "n";
  return `${keep}......@${domain}`;
}

function memberLabel(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `Member since ${date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
}

export function SellerDetailCard({
  name,
  photoUrl,
  verified,
  rating,
  reviewCount,
  soldCount,
  joinedAt,
  email,
  phone,
  isOwner,
  busy,
  onProfile,
  onCall,
  onChat,
  onEdit,
}: {
  name: string;
  photoUrl?: string | null;
  verified: boolean;
  rating: string;
  reviewCount: number;
  soldCount?: number;
  joinedAt?: string | null;
  email?: string | null;
  phone?: string;
  isOwner: boolean;
  busy?: boolean;
  onProfile: () => void;
  onCall: () => void;
  onChat: () => void;
  onEdit?: () => void;
}) {
  const shownEmail = maskEmail(email);
  const joined = memberLabel(joinedAt);
  const ratingLabel = Number(rating) > 0 ? rating : "—";
  const reviewLabel = reviewCount > 0 ? String(reviewCount) : "—";
  const soldLabel = soldCount && soldCount > 0 ? String(soldCount) : null;

  async function smsSeller() {
    if (!phone) return;
    const url = `sms:${phone.replace(/\s/g, "")}`;
    try {
      await Linking.openURL(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: LINE,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <PressScale onPress={onProfile} style={{ flexDirection: "row", alignItems: "center" }}>
        <Avatar name={name} uri={photoUrl} size={56} borderWidth={0} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontWeight: "800", fontSize: 16, color: "#111827" }} numberOfLines={1}>
            {name}
          </Text>
          {joined ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
              <Ionicons name="calendar-outline" size={13} color="#6B7280" />
              <Text style={{ color: "#6B7280", fontSize: 12 }}>{joined}</Text>
            </View>
          ) : null}
          {shownEmail ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
              <Ionicons name="mail-outline" size={13} color="#6B7280" />
              <Text style={{ color: "#6B7280", fontSize: 12 }}>{shownEmail}</Text>
            </View>
          ) : null}
        </View>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        </View>
      </PressScale>

      <View style={{ flexDirection: "row", marginTop: 14, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 12 }}>
        <Stat
          icon="star"
          iconColor="#F5C518"
          value={ratingLabel}
          label="Rating"
        />
        <View style={{ width: 1, backgroundColor: LINE }} />
        <Stat
          icon="chatbubble-ellipses-outline"
          iconColor="#7C3AED"
          value={reviewLabel}
          label="Reviews"
        />
        {soldLabel ? (
          <>
            <View style={{ width: 1, backgroundColor: LINE }} />
            <Stat icon="bag-check-outline" iconColor="#EA580C" value={soldLabel} label="Sold" />
          </>
        ) : null}
        <View style={{ width: 1, backgroundColor: LINE }} />
        <Stat
          icon={verified ? "checkmark-circle" : "person-outline"}
          iconColor={verified ? "#16A34A" : "#9CA3AF"}
          value={verified ? "Verified" : "Unverified"}
          label="Status"
        />
      </View>

      {isOwner ? (
        <PressScale
          onPress={onEdit}
          style={{
            marginTop: 14,
            backgroundColor: "#1B7D2C",
            borderRadius: 10,
            height: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={{ fontWeight: "800", fontSize: 13, color: "#fff" }}>Edit listing</Text>
        </PressScale>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <PressScale
            onPress={onCall}
            style={{
              flex: 1,
              backgroundColor: BLUE,
              borderRadius: 10,
              height: 42,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="call" size={15} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Call</Text>
          </PressScale>
          <PressScale
            onPress={onChat}
            style={{
              flex: 1,
              borderWidth: 1.5,
              borderColor: BLUE,
              borderRadius: 10,
              height: 42,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Ionicons name="chatbubble-outline" size={15} color={BLUE} />
            <Text style={{ color: BLUE, fontWeight: "800", fontSize: 13 }}>{busy ? "…" : "Chat"}</Text>
          </PressScale>
          <PressScale
            onPress={() => void smsSeller()}
            style={{
              flex: 1,
              borderWidth: 1.5,
              borderColor: BLUE,
              borderRadius: 10,
              height: 42,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="chatbox-ellipses-outline" size={15} color={BLUE} />
            <Text style={{ color: BLUE, fontWeight: "800", fontSize: 13 }}>SMS</Text>
          </PressScale>
        </View>
      )}
    </View>
  );
}

function Stat({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: Ion;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 4 }}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={{ fontWeight: "800", fontSize: 13, color: "#111827", marginTop: 4 }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
