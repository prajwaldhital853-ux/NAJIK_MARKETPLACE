import { Ionicons } from "@expo/vector-icons";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { AuthImage } from "./AuthImage";
import { PressScale } from "./PressScale";

export function nameInitial(name?: string | null) {
  const letter = (name || "N").trim().charAt(0).toUpperCase();
  return letter || "N";
}

export function Avatar({
  name,
  uri,
  size,
  borderColor = "#fff",
  borderWidth = 2,
  onCamera,
  style,
  priority,
}: {
  name?: string | null;
  uri?: string | null;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  onCamera?: () => void;
  style?: StyleProp<ViewStyle>;
  priority?: "low" | "normal" | "high";
}) {
  const cam = Math.max(18, Math.round(size * 0.32));
  return (
    <View style={[{ width: size, height: size }, style]}>
      {uri ? (
        <AuthImage
          uri={uri}
          priority={priority}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor,
            backgroundColor: "#1B7D2C",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: Math.max(16, size * 0.38) }}>{nameInitial(name)}</Text>
        </View>
      )}
      {onCamera ? (
        <PressScale
          onPress={onCamera}
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: cam,
            height: cam,
            borderRadius: cam / 2,
            backgroundColor: "#1FA24C",
            borderWidth: 2,
            borderColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="camera" size={Math.max(10, cam * 0.5)} color="#fff" />
        </PressScale>
      ) : null}
    </View>
  );
}
