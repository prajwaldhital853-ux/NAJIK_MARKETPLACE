import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";

/** Inline warning card for Home / Profile — visible while staff_warning is set. */
export function StaffWarningCard({ style }: { style?: object }) {
  const { user } = useAuth();
  const warning = (user?.staff_warning || "").trim();
  if (!warning) return null;

  return (
    <View
      style={{
        backgroundColor: "#FFF8E6",
        borderWidth: 1,
        borderColor: "#F0D48A",
        borderRadius: 14,
        padding: 12,
        flexDirection: "row",
        gap: 10,
        marginBottom: 12,
        ...shadow.card,
        ...style,
      }}
    >
      <Ionicons name="warning" size={22} color="#B45309" style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", color: "#92400E", fontSize: 13 }}>Account warning from NAJIK</Text>
        <Text style={{ color: "#78350F", marginTop: 4, fontSize: 13, lineHeight: 18 }}>{warning}</Text>
      </View>
    </View>
  );
}

/** Shows admin deactivation notes for the seller's listings on Home / Profile. */
export function ListingAdminNotesCard({ listings }: { listings: { id: string; title: string; status: string; admin_reason?: string }[] }) {
  const notes = listings.filter((row) => row.status === "deactivated" && (row.admin_reason || "").trim());
  if (!notes.length) return null;
  return (
    <View
      style={{
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        gap: 10,
        ...shadow.card,
      }}
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Ionicons name="alert-circle" size={22} color="#B91C1C" style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: "#991B1B", fontSize: 13 }}>Listing deactivated by NAJIK admin</Text>
          <Text style={{ color: "#7F1D1D", marginTop: 4, fontSize: 12, lineHeight: 17 }}>
            Buyers cannot see these listings until an admin reactivates them.
          </Text>
        </View>
      </View>
      {notes.map((row) => (
        <View key={row.id} style={{ backgroundColor: "#fff", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#FECACA" }}>
          <Text style={{ fontWeight: "700", color: "#111827", fontSize: 13 }}>{row.title}</Text>
          <Text style={{ color: "#7F1D1D", marginTop: 4, fontSize: 13, lineHeight: 18 }}>{row.admin_reason}</Text>
        </View>
      ))}
    </View>
  );
}

export function StaffWarningBanner() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const warning = (user?.staff_warning || "").trim();
  const key = warning && user?.id ? `${user.id}:${user.staff_warning_at || warning}` : "";

  useEffect(() => {
    // New warning or user switch → show again.
    setDismissedKey(null);
  }, [key]);

  if (!warning || !key || dismissedKey === key) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top: insets.top + 8,
        zIndex: 200,
        elevation: 20,
      }}
    >
      <View
        style={{
          backgroundColor: "#FFF8E6",
          borderWidth: 1,
          borderColor: "#F0D48A",
          borderRadius: 14,
          padding: 12,
          flexDirection: "row",
          gap: 10,
          ...shadow.card,
        }}
      >
        <Ionicons name="warning" size={22} color="#B45309" style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: "#92400E", fontSize: 13 }}>Account warning from NAJIK</Text>
          <Text style={{ color: "#78350F", marginTop: 4, fontSize: 13, lineHeight: 18 }}>{warning}</Text>
        </View>
        <Pressable onPress={() => setDismissedKey(key)} hitSlop={10}>
          <Ionicons name="close" size={20} color="#92400E" />
        </Pressable>
      </View>
    </View>
  );
}
