import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";
import { PressScale } from "./PressScale";
import { colors, shadow } from "../theme";

type Ion = ComponentProps<typeof Ionicons>["name"];

export const ACCOUNT_GREEN = colors.greenDeep;
export const ACCOUNT_ICON_BG = colors.greenSoft;
export const ACCOUNT_PAGE_BG = "#F3F4F6";

export function AccountQuickAction({ icon, label, onPress }: { icon: Ion; label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: ACCOUNT_ICON_BG,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={ACCOUNT_GREEN} />
      </View>
      <Text style={{ marginTop: 8, fontWeight: "700", fontSize: 11, color: "#111827", textAlign: "center" }} numberOfLines={2}>
        {label}
      </Text>
    </PressScale>
  );
}

export function AccountSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 13, marginBottom: 10 }}>{title}</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", ...shadow.card }}>{children}</View>
    </View>
  );
}

export function AccountMenuRow({
  icon,
  label,
  onPress,
  trailing,
  last,
}: {
  icon: Ion;
  label: string;
  onPress?: () => void;
  trailing?: ReactNode;
  last?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: ACCOUNT_ICON_BG,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={ACCOUNT_GREEN} />
      </View>
      <Text style={{ flex: 1, marginLeft: 12, fontWeight: "600", fontSize: 15, color: "#111827" }}>{label}</Text>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color="#C4C7CC" />}
    </PressScale>
  );
}

export function AccountQuickRow({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 18,
        paddingVertical: 14,
        flexDirection: "row",
        ...shadow.card,
      }}
    >
      {children}
    </View>
  );
}

export function AccountQuickDivider() {
  return <View style={{ width: 1, backgroundColor: "#EEF0F3" }} />;
}
