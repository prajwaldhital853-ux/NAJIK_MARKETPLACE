import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { confirmPasswordReset, requestPasswordReset } from "../authApi";
import { colors, shadow } from "../theme";

export function PasswordResetScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { onInputFocus } = useKeyboardScroll();
  const [identifier, setIdentifier] = useState("");
  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request() {
    setError("");
    try {
      const res = await requestPasswordReset(identifier.trim());
      setMessage(res.detail);
      if (res.dev_reset) {
        setUid(res.dev_reset.uid);
        setToken(res.dev_reset.token);
        setMessage("Dev reset token filled. Set a new password below.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start reset.");
    }
  }

  async function confirm() {
    setError("");
    try {
      await confirmPasswordReset(uid, token, password);
      setMessage("Password updated. You can log in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    }
  }

  return (
    <KeyboardScreen enableRefresh={false} style={{ backgroundColor: colors.bg }} contentStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20 }}>
      <PressScale onPress={() => navigation.goBack()} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Ionicons name="arrow-back" size={22} color={colors.navy} />
        <Text style={{ fontWeight: "700" }}>Back</Text>
      </PressScale>
      <NajikWordmark />
      <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 22, marginTop: 24, ...shadow.card }}>
        <Text style={{ fontSize: 24, fontWeight: "800" }}>Reset password</Text>
        <TextInput placeholder="Phone or email" value={identifier} onChangeText={setIdentifier} onFocus={onInputFocus} autoCapitalize="none" style={field} />
        <PressScale onPress={() => void request()} style={btn}>
          <Text style={btnText}>Send reset</Text>
        </PressScale>
        <TextInput placeholder="New password" value={password} onChangeText={setPassword} onFocus={onInputFocus} secureTextEntry style={field} />
        <PressScale onPress={() => void confirm()} style={btn}>
          <Text style={btnText}>Set new password</Text>
        </PressScale>
        {message ? <Text style={{ marginTop: 10, color: colors.green }}>{message}</Text> : null}
        {error ? <Text style={{ marginTop: 8, color: colors.red }}>{error}</Text> : null}
      </View>
    </KeyboardScreen>
  );
}

const field = {
  marginTop: 12,
  borderWidth: 1,
  borderColor: "#E6E8EC",
  borderRadius: 12,
  height: 50,
  paddingHorizontal: 12,
} as const;

const btn = {
  marginTop: 12,
  backgroundColor: "#1B7D2C",
  borderRadius: 28,
  paddingVertical: 14,
  alignItems: "center" as const,
};

const btnText = { color: "#fff", fontWeight: "800" as const };
