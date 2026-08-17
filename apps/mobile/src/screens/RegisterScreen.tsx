import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";

export function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  function submit() {
    void register({
      full_name: fullName.trim() || "Sunil K. Sah",
      phone: phone.replace(/\s/g, "") || undefined,
    });
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.bg }} contentStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
      <NajikWordmark />
      <Animated.View entering={FadeInUp.springify()} style={{ backgroundColor: colors.white, borderRadius: 24, padding: 22, marginTop: 24, ...shadow.card }}>
        <Text style={{ fontSize: 26, fontWeight: "800" }}>Create an account</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Join NAJIK and find everything near you</Text>
        <Field icon="person-outline" placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <Field icon="phone-portrait-outline" placeholder="Phone number" value={phone} onChangeText={setPhone} phone />
        <PressScale
          onPress={submit}
          style={{ marginTop: 16, backgroundColor: colors.green, borderRadius: 28, paddingVertical: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Create account</Text>
        </PressScale>
      </Animated.View>
      <PressScale onPress={() => navigation.goBack()} style={{ marginTop: 16, alignItems: "center", marginBottom: 12 }}>
        <Text style={{ color: colors.green, fontWeight: "700" }}>Already have an account? Log in</Text>
      </PressScale>
    </KeyboardScreen>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  phone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  phone?: boolean;
}) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50, gap: 8, marginTop: 12 }}>
      <Ionicons name={icon} size={18} color={colors.green} />
      {phone ? <Text style={{ fontWeight: "700" }}>+977</Text> : null}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        onFocus={onInputFocus}
        keyboardType={phone ? "phone-pad" : "default"}
        style={{ flex: 1 }}
      />
    </View>
  );
}
