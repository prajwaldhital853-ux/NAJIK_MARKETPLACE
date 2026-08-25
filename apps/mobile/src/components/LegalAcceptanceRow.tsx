import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import type { LegalRole } from "../legal/legalDocuments";
import { colors } from "../theme";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";

export function LegalAcceptanceRow({
  role,
  checked,
  onChange,
  compact,
  disabled,
}: {
  role: LegalRole;
  checked: boolean;
  onChange: (value: boolean) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const navigation = useNavigation<any>();

  function open(doc: "terms" | "privacy") {
    navigation.navigate("LegalDocument", { doc, role });
  }

  return (
    <View style={{ marginTop: compact ? 8 : 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, opacity: disabled ? 0.6 : 1 }}>
        <PressScale onPress={() => !disabled && onChange(!checked)} disabled={disabled} hitSlop={8}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: checked ? GREEN : colors.border,
              backgroundColor: checked ? GREEN : colors.white,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
        </PressScale>
        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: compact ? 11 : 12, lineHeight: compact ? 16 : 18 }}>
          I have read and agree to NAJIK's{" "}
          <Text onPress={() => open("terms")} suppressHighlighting style={{ color: GREEN, fontWeight: "800", textDecorationLine: "underline" }}>
            Terms & Conditions
          </Text>{" "}
          and{" "}
          <Text onPress={() => open("privacy")} suppressHighlighting style={{ color: GREEN, fontWeight: "800", textDecorationLine: "underline" }}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
      {!checked ? (
        <Text style={{ marginTop: 4, marginLeft: 32, color: colors.muted, fontSize: 10 }}>
          Required to continue
        </Text>
      ) : null}
    </View>
  );
}

export function LegalDocLinksRow({ role, compact }: { role: LegalRole; compact?: boolean }) {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: compact ? 8 : 12, justifyContent: "center" }}>
      <Pressable onPress={() => navigation.navigate("LegalDocument", { doc: "terms", role })}>
        <Text style={{ color: GREEN, fontSize: compact ? 11 : 12, fontWeight: "700", textDecorationLine: "underline" }}>Terms & Conditions</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("LegalDocument", { doc: "privacy", role })}>
        <Text style={{ color: GREEN, fontSize: compact ? 11 : 12, fontWeight: "700", textDecorationLine: "underline" }}>Privacy Policy</Text>
      </Pressable>
    </View>
  );
}
