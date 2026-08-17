import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { isPendingProvider, isProvider } from "../demo";
import { colors, shadow } from "../theme";
import { NajikLogo } from "./NajikLogo";
import { PressScale } from "./PressScale";

const dotStyle = {
  position: "absolute" as const,
  top: -1,
  right: -1,
  width: 9,
  height: 9,
  borderRadius: 5,
  backgroundColor: "#22C55E",
  borderWidth: 1.5,
  borderColor: "#fff",
};

type Props = {
  right?: "bell" | "bell-chat" | "bell-settings" | "bell-filter" | "draft";
  showLocation?: boolean;
  showPro?: boolean;
  location?: string;
  onClose?: () => void;
  bellCount?: number;
  pinColor?: string;
};

export function AppHeader({
  right = "bell",
  showLocation = false,
  showPro,
  location = "Lahan, Siraha",
  onClose,
  bellCount,
  pinColor = "#111827",
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const pro = showPro ?? isProvider(user);
  const pending = isPendingProvider(user);

  function openDrawer() {
    const parent = navigation.getParent();
    // @ts-expect-error drawer parent
    parent?.openDrawer?.();
  }

  return (
    <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={12} style={{ zIndex: 2, width: 32 }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
        ) : (
          <Pressable onPress={openDrawer} hitSlop={12} style={{ zIndex: 2, width: 32 }}>
            <Ionicons name="menu" size={26} color="#111827" />
          </Pressable>
        )}

        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, alignItems: "center" }}>
          <NajikLogo size="sm" showTagline={false} layout="row" />
        </View>
        <View style={{ flex: 1 }} />
        {pro ? (
          <View style={{ backgroundColor: pending ? colors.orangeSoft : "#E4F6EA", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: pending ? "#F5C18A" : "#BFE6C9", marginRight: 8 }}>
            <Text style={{ color: pending ? colors.orange : "#146B32", fontSize: 10, fontWeight: "800" }}>
              {pending ? "Pending" : "Service Pro"}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {right === "draft" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
              <Ionicons name="save-outline" size={14} color={colors.green} />
              <Text style={{ color: colors.green, fontWeight: "700", fontSize: 12 }}>Save Draft</Text>
            </View>
          ) : (
            <View>
              <Ionicons name="notifications-outline" size={22} color="#111827" />
              {bellCount ? (
                <View
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -7,
                    backgroundColor: "#E53935",
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 3,
                    borderWidth: 1.5,
                    borderColor: "#fff",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{bellCount}</Text>
                </View>
              ) : (
                <View style={dotStyle} />
              )}
            </View>
          )}
          {right === "bell-chat" ? (
            <View>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.navy} />
              <View style={dotStyle} />
            </View>
          ) : null}
          {right === "bell-settings" ? <Ionicons name="settings-outline" size={22} color={colors.navy} /> : null}
          {right === "bell-filter" ? <Ionicons name="options-outline" size={22} color={colors.navy} /> : null}
          {right === "draft" && onClose ? (
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.navy} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {showLocation ? (
        <View style={{ alignItems: "center", paddingBottom: 10 }}>
          <PressScale
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 22,
              gap: 6,
              ...shadow.card,
            }}
          >
            <Ionicons name="location" size={15} color={pinColor} />
            <Text style={{ fontWeight: "700", color: "#111827" }}>{location}</Text>
            <Ionicons name="chevron-down" size={14} color="#111827" />
          </PressScale>
        </View>
      ) : null}
    </View>
  );
}
