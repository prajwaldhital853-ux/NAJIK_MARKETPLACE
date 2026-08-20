import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StatusBar, Text, TextInput, View } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { friendlyError } from "../api";
import { requestOtp } from "../authApi";
import { useAuth } from "../context/AuthContext";
import { isProvider } from "../demo";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

export function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { user, verifyContact, logout } = useAuth();
  const purpose: "phone" | "email" = user?.phone ? "phone" : "email";
  const seller = isProvider(user);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("Use code 1234 for now.");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const { onInputFocus } = useKeyboardScroll();

  useEffect(() => {
    StatusBar.setHidden(true, "fade");
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
    }
  }, []);

  useEffect(() => {
    void requestOtp(purpose)
      .then(() => setInfo("Code sent. Use 1234 until SMS is connected."))
      .catch((err) => setError(friendlyError(err, "Could not send code.")));
  }, [purpose]);

  async function send() {
    if (sending || verifying) return;
    setError("");
    setSending(true);
    try {
      await requestOtp(purpose);
      setInfo("Code sent. Use 1234 until SMS is connected.");
    } catch (err) {
      setError(friendlyError(err, "Could not send code."));
    } finally {
      setSending(false);
    }
  }

  async function submit() {
    if (verifying || sending) return;
    setError("");
    setVerifying(true);
    try {
      await verifyContact(purpose, code.trim() || "1234");
    } catch (err) {
      setError(friendlyError(err, "Invalid code."));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ExpoStatusBar hidden />
      <KeyboardScreen
        enableRefresh={false}
        style={{ backgroundColor: colors.bg }}
        contentStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20 }}
      >
        <NajikWordmark />
        <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 22, marginTop: 24, ...shadow.card }}>
          <Text style={{ fontSize: 24, fontWeight: "800" }}>Verify your {purpose}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>
            {purpose === "phone" ? user?.phone : user?.email}. Use 1234 for now.
            {seller ? " After this your application goes for admin review." : " After this you will sign in."}
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            onFocus={onInputFocus}
            keyboardType="number-pad"
            placeholder="1234"
            maxLength={6}
            editable={!verifying}
            style={{
              marginTop: 16,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              height: 50,
              paddingHorizontal: 14,
              fontSize: 20,
              letterSpacing: 8,
            }}
          />
          {info ? <Text style={{ marginTop: 10, color: colors.muted }}>{info}</Text> : null}
          {error ? <Text style={{ marginTop: 8, color: colors.red }}>{error}</Text> : null}
          <PressScale
            onPress={() => void submit()}
            disabled={verifying}
            style={{
              marginTop: 16,
              backgroundColor: GREEN,
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: verifying ? 0.85 : 1,
            }}
          >
            {verifying ? <ActivityIndicator color="#fff" /> : null}
            <Text style={{ color: "#fff", fontWeight: "800" }}>{verifying ? "Verifying…" : "Verify"}</Text>
          </PressScale>
          <PressScale
            onPress={() => void send()}
            disabled={sending || verifying}
            style={{
              marginTop: 12,
              height: 44,
              borderRadius: 12,
              borderWidth: 1.4,
              borderColor: GREEN,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? <ActivityIndicator color={GREEN} /> : null}
            <Text style={{ color: GREEN, fontWeight: "800" }}>{sending ? "Sending…" : "Send code"}</Text>
          </PressScale>
          <PressScale onPress={() => void logout()} style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontWeight: "700" }}>Log out</Text>
          </PressScale>
        </View>
      </KeyboardScreen>
    </View>
  );
}
