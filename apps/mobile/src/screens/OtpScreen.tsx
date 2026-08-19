import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { requestOtp } from "../authApi";
import { useAuth } from "../context/AuthContext";
import { isProvider } from "../demo";
import { colors, shadow } from "../theme";

export function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { user, verifyContact, logout } = useAuth();
  const purpose: "phone" | "email" = user?.phone ? "phone" : "email";
  const seller = isProvider(user);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("Use code 1234 for now.");
  const { onInputFocus } = useKeyboardScroll();

  useEffect(() => {
    void requestOtp(purpose)
      .then(() => setInfo("Code sent. Use 1234 until SMS is connected."))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not send code."));
  }, [purpose]);

  async function send() {
    setError("");
    try {
      await requestOtp(purpose);
      setInfo("Code sent. Use 1234 until SMS is connected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    }
  }

  async function submit() {
    setError("");
    try {
      await verifyContact(purpose, code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    }
  }

  return (
    <KeyboardScreen enableRefresh={false} style={{ backgroundColor: colors.bg }} contentStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20 }}>
      <NajikWordmark />
      <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 22, marginTop: 24, ...shadow.card }}>
        <Text style={{ fontSize: 24, fontWeight: "800" }}>Verify your {purpose}</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>
          {purpose === "phone" ? user?.phone : user?.email}. Use 1234 for now.
          {seller ? " After this you will enter seller details." : " After this you will sign in."}
        </Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          onFocus={onInputFocus}
          keyboardType="number-pad"
          placeholder="1234"
          maxLength={6}
          style={{ marginTop: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, height: 50, paddingHorizontal: 14, fontSize: 20, letterSpacing: 8 }}
        />
        {info ? <Text style={{ marginTop: 10, color: colors.muted }}>{info}</Text> : null}
        {error ? <Text style={{ marginTop: 8, color: colors.red }}>{error}</Text> : null}
        <PressScale onPress={() => void submit()} style={{ marginTop: 16, backgroundColor: colors.green, borderRadius: 28, paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>Verify</Text>
        </PressScale>
        <PressScale onPress={() => void send()} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ color: colors.green, fontWeight: "700" }}>Send code</Text>
        </PressScale>
        <PressScale onPress={() => void logout()} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontWeight: "700" }}>Log out</Text>
        </PressScale>
      </View>
    </KeyboardScreen>
  );
}
