import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { friendlyError } from "../api";
import { requestOtp } from "../authApi";
import { useAuth } from "../context/AuthContext";
import { PressScale } from "./PressScale";
import { colors } from "../theme";

const GREEN = "#1B7D2C";

export function BuyerPhoneVerifyModal() {
  const insets = useSafeAreaInsets();
  const { user, verifyContact } = useAuth();
  const phone = user?.phone || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("Use code 1234 for now.");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!phone) return;
    void requestOtp("phone", phone)
      .then(() => setInfo("Code sent. Use 1234 until SMS is connected."))
      .catch((err) => setError(friendlyError(err, "Could not send code.")));
  }, [phone]);

  async function send() {
    if (sending || verifying || !phone) return;
    setError("");
    setSending(true);
    try {
      await requestOtp("phone", phone);
      setInfo("Code sent. Use 1234 until SMS is connected.");
    } catch (err) {
      setError(friendlyError(err, "Could not send code."));
    } finally {
      setSending(false);
    }
  }

  async function submit() {
    if (verifying || sending || !phone) return;
    setError("");
    setVerifying(true);
    try {
      await verifyContact("phone", code.trim() || "1234");
    } catch (err) {
      setError(friendlyError(err, "Invalid code."));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(17,24,39,0.72)", justifyContent: "center", paddingHorizontal: 20, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 22 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>Verify your phone</Text>
          <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>
            NAJIK needs to confirm <Text style={{ fontWeight: "800", color: "#111827" }}>+977 {phone}</Text> before you can continue.
            This step is required and cannot be skipped.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
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
          {info ? <Text style={{ marginTop: 10, color: colors.muted, fontSize: 12 }}>{info}</Text> : null}
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
            <Text style={{ color: "#fff", fontWeight: "800" }}>{verifying ? "Verifying…" : "Verify phone"}</Text>
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
            <Text style={{ color: GREEN, fontWeight: "800" }}>{sending ? "Sending…" : "Resend code"}</Text>
          </PressScale>
        </View>
      </View>
    </Modal>
  );
}
