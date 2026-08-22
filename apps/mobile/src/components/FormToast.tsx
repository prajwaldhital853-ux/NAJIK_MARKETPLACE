import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function FormToast({
  message,
  variant = "error",
}: {
  message: string;
  variant?: "error" | "success";
}) {
  const insets = useSafeAreaInsets();
  const error = variant === "error";
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        top: Math.max(insets.top, 12) + 8,
        zIndex: 40,
      }}
    >
      <View
        style={{
          backgroundColor: error ? "#B91C1C" : "#146B32",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name={error ? "alert-circle" : "checkmark-circle"} size={18} color="#fff" />
        <Text style={{ flex: 1, color: "#fff", fontWeight: "700", fontSize: 13 }}>{message}</Text>
      </View>
    </View>
  );
}
