import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { ApiError, friendlyError } from "../api";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

export function SellerLoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockLeft, setLockLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const { onInputFocus } = useKeyboardScroll();

  useEffect(() => {
    if (lockLeft <= 0) return;
    const id = setInterval(() => setLockLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockLeft]);

  async function submit() {
    if (lockLeft > 0) return;
    setError("");
    setBusy(true);
    try {
      await login(phone.replace(/\s/g, ""), password, "provider");
    } catch (err) {
      if (err instanceof ApiError && err.code === "use_buyer_login") {
        Alert.alert("Buyer account", err.message, [{ text: "Go to user login", onPress: () => navigation.navigate("Login") }]);
      } else if (err instanceof ApiError && err.retryAfter) {
        setLockLeft(err.retryAfter);
        setError(err.message);
      } else {
        setError(friendlyError(err, "Could not sign in. Use the verified phone number and password."));
      }
    } finally {
      setBusy(false);
    }
  }

  const mm = Math.floor(lockLeft / 60);
  const ss = String(lockLeft % 60).padStart(2, "0");

  return (
    <KeyboardScreen enableRefresh={false} style={{ backgroundColor: colors.white }} contentStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
      <PressScale onPress={() => navigation.navigate("Login", { page: "provider" })} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Ionicons name="arrow-back" size={22} color="#111827" />
        <Text style={{ fontWeight: "700" }}>Back</Text>
      </PressScale>
      <NajikWordmark scale={0.8} />
      <View style={{ backgroundColor: colors.white, borderRadius: 24, padding: 20, marginTop: 20, borderWidth: 1, borderColor: colors.border, ...shadow.card }}>
        <Text style={{ fontSize: 24, fontWeight: "800" }}>Service provider login</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
          Sign in with the phone number you verified by OTP and the password you created.
        </Text>
        <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 16, height: 52, paddingLeft: 12 }}>
          <Ionicons name="phone-portrait-outline" size={18} color={GREEN} />
          <Text style={{ fontWeight: "800", marginLeft: 8 }}>+977</Text>
          <TextInput
            placeholder="Phone number"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            onFocus={onInputFocus}
            keyboardType="phone-pad"
            style={{ flex: 1, paddingHorizontal: 12, height: 52 }}
          />
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 16, height: 52, paddingHorizontal: 12, gap: 8 }}>
          <Ionicons name="lock-closed-outline" size={18} color={GREEN} />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            onFocus={onInputFocus}
            secureTextEntry
            style={{ flex: 1 }}
          />
        </View>
        {lockLeft > 0 ? <Text style={{ marginTop: 10, color: colors.red, fontWeight: "700" }}>Try again in {mm}:{ss}</Text> : null}
        {error && lockLeft === 0 ? <Text style={{ marginTop: 10, color: colors.red }}>{error}</Text> : null}
        <PressScale
          onPress={() => void submit()}
          style={{ marginTop: 16, backgroundColor: GREEN, borderRadius: 28, height: 52, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{busy ? "Signing in…" : "Login as service provider"}</Text>
        </PressScale>
        <PressScale onPress={() => navigation.navigate("PasswordReset")} style={{ marginTop: 14, alignItems: "center" }}>
          <Text style={{ color: GREEN, fontWeight: "700" }}>Forgot password?</Text>
        </PressScale>
      </View>
    </KeyboardScreen>
  );
}
