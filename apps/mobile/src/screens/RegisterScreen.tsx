import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { friendlyError } from "../api";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";
import type { AccountType } from "../types";

export function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { register } = useAuth();
  const accountType: AccountType = route.params?.accountType === "provider" ? "provider" : "user";
  const seller = accountType === "provider";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { onInputFocus } = useKeyboardScroll();

  async function submit() {
    setError("");
    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!phone.replace(/\s/g, "")) {
      setError("Enter a phone number.");
      return;
    }
    setBusy(true);
    try {
      await register({
        full_name: fullName.trim(),
        phone: phone.replace(/\s/g, ""),
        email: email.trim() || undefined,
        password,
        account_type: accountType,
      });
    } catch (err) {
      setError(friendlyError(err, "Unable to create this account."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardScreen enableRefresh={false} style={{ backgroundColor: colors.bg }} contentStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
      <PressScale onPress={() => navigation.navigate("Login")} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Ionicons name="arrow-back" size={22} color={colors.navy} />
        <Text style={{ fontWeight: "700" }}>Back to login</Text>
      </PressScale>
      <NajikWordmark />
      <View style={{ backgroundColor: colors.white, borderRadius: 24, padding: 22, marginTop: 24, ...shadow.card }}>
        <Text style={{ fontSize: 26, fontWeight: "800" }}>Create an account</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          {seller ? "Service provider signup" : "Join NAJIK as a buyer"}
        </Text>
        <Field icon="person-outline" placeholder="Full name" value={fullName} onChangeText={setFullName} onFocus={onInputFocus} />
        <Field icon="phone-portrait-outline" placeholder="Phone number" value={phone} onChangeText={setPhone} onFocus={onInputFocus} phone />
        {seller ? null : (
          <Field icon="mail-outline" placeholder="Email (optional)" value={email} onChangeText={setEmail} onFocus={onInputFocus} />
        )}
        <Field icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} onFocus={onInputFocus} secure />
        <Text style={{ marginTop: 10, color: colors.muted, fontSize: 12 }}>
          {seller ? "Next you will verify OTP, then enter seller details." : "Next you will verify OTP, then sign in."}
        </Text>
        {error ? <Text style={{ marginTop: 10, color: colors.red }}>{error}</Text> : null}
        <PressScale
          onPress={() => void submit()}
          style={{ marginTop: 16, backgroundColor: colors.green, borderRadius: 28, paddingVertical: 14, alignItems: "center", opacity: busy ? 0.7 : 1 }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{busy ? "Creating…" : seller ? "Continue to OTP" : "Create account"}</Text>
        </PressScale>
      </View>
      <PressScale onPress={() => navigation.navigate("Login")} style={{ marginTop: 16, alignItems: "center", marginBottom: 12 }}>
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
  secure,
  onFocus,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  phone?: boolean;
  secure?: boolean;
  onFocus: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50, gap: 8, marginTop: 12 }}>
      <Ionicons name={icon} size={18} color={colors.green} />
      {phone ? <Text style={{ fontWeight: "700" }}>+977</Text> : null}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        keyboardType={phone ? "phone-pad" : "default"}
        secureTextEntry={secure}
        autoCapitalize="none"
        style={{ flex: 1 }}
      />
    </View>
  );
}
