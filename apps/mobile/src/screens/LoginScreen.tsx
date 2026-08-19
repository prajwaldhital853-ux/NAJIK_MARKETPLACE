import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CitySkyline, HouseTreesMark } from "../components/CitySkyline";
import { GoogleMark } from "../components/GoogleMark";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { ServiceCategoryBar } from "../components/ServiceCategoryBar";
import { ApiError, friendlyError } from "../api";
import { useAuth } from "../context/AuthContext";
import { takeLoginHint } from "../loginHint";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const PHONE_BTN = "#C8EBD4";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hint = takeLoginHint();
  const [error, setError] = useState(hint.message || "");
  const [info, setInfo] = useState(route.params?.registered && !hint.message ? "Account created. Sign in to continue." : "");
  const [lockLeft, setLockLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const { onInputFocus } = useKeyboardScroll();

  useEffect(() => {
    if (hint.identifier) setPhone(String(hint.identifier).replace(/^\+?977/, ""));
    else if (route.params?.identifier) setPhone(String(route.params.identifier).replace(/^\+?977/, ""));
  }, [route.params?.identifier]);

  useEffect(() => {
    if (lockLeft <= 0) return;
    const id = setInterval(() => setLockLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockLeft]);

  async function submit() {
    if (lockLeft > 0) return;
    if (!showPassword || !password) {
      setShowPassword(true);
      setError("");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const identifier = phone.includes("@") ? phone.trim() : phone.replace(/\s/g, "");
      await login(identifier, password);
    } catch (err) {
      if (err instanceof ApiError && err.retryAfter) {
        setLockLeft(err.retryAfter);
        setError(err.message);
      } else {
        setError(friendlyError(err, "Could not sign in. Check your phone/email and password."));
      }
    } finally {
      setBusy(false);
    }
  }

  const mm = Math.floor(lockLeft / 60);
  const ss = String(lockLeft % 60).padStart(2, "0");

  return (
    <KeyboardScreen enableRefresh={false} style={{ backgroundColor: colors.white }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, alignItems: "center" }}>
        <NajikWordmark />
        <View style={{ marginTop: 14, width: "100%" }}>
          <ServiceCategoryBar />
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        <CitySkyline />
      </View>

      <View
        style={{
          backgroundColor: colors.white,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -42,
          paddingHorizontal: 18,
          paddingTop: 20,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text, textAlign: "center" }}>Welcome Back!</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>Login to continue to Najik</Text>

        <PressScale
          onPress={() => Alert.alert("Google", "Google sign-in will work once GOOGLE_CLIENT_IDS is set on the API.")}
          style={{
            marginTop: 18,
            backgroundColor: GREEN,
            borderRadius: 28,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ position: "absolute", left: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <GoogleMark size={16} />
          </View>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Continue with Google</Text>
        </PressScale>

        <PressScale
          onPress={() => Alert.alert("Apple", "Apple sign-in will be available on iOS builds.")}
          style={{
            marginTop: 10,
            backgroundColor: colors.white,
            borderRadius: 28,
            height: 52,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="logo-apple" size={20} color={colors.text} style={{ position: "absolute", left: 16 }} />
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>Continue with Apple</Text>
        </PressScale>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>or continue with</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            height: 52,
            paddingLeft: 12,
            overflow: "hidden",
          }}
        >
          <Ionicons name="phone-portrait-outline" size={18} color={GREEN} />
          <Text style={{ fontWeight: "800", color: colors.text, marginLeft: 8 }}>+977</Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} style={{ marginLeft: 2, marginRight: 10 }} />
          <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
          <TextInput
            placeholder="Enter your phone number"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            onFocus={onInputFocus}
            keyboardType="phone-pad"
            autoCapitalize="none"
            style={{ flex: 1, color: colors.text, paddingHorizontal: 12, height: 52 }}
          />
        </View>
        {showPassword ? (
          <View
            style={{
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              height: 52,
              paddingHorizontal: 12,
              gap: 8,
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={GREEN} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              onFocus={onInputFocus}
              secureTextEntry
              style={{ flex: 1, color: colors.text }}
            />
          </View>
        ) : null}

        {lockLeft > 0 ? (
          <Text style={{ marginTop: 10, color: colors.red, fontWeight: "700" }}>Try again in {mm}:{ss}</Text>
        ) : null}
        {info && !error ? <Text style={{ marginTop: 10, color: GREEN, fontWeight: "700" }}>{info}</Text> : null}
        {error && lockLeft === 0 ? <Text style={{ marginTop: 10, color: colors.red }}>{error}</Text> : null}

        <PressScale
          onPress={() => void submit()}
          style={{
            marginTop: 14,
            backgroundColor: lockLeft ? colors.border : PHONE_BTN,
            borderRadius: 28,
            height: 52,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ color: GREEN, fontWeight: "800", fontSize: 16 }}>{busy ? "Signing in…" : "Continue with Phone"}</Text>
          <Ionicons name="arrow-forward" size={18} color={GREEN} />
        </PressScale>

        <View style={{ alignItems: "center", marginTop: 16, paddingBottom: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>By continuing, you agree to our</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Ionicons name="lock-closed" size={12} color={colors.muted} />
            <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>Terms of Service and Privacy Policy</Text>
          </View>
        </View>
      </View>

      <PressScale
        onPress={() => navigation.navigate("Welcome")}
        style={{
          marginHorizontal: 16,
          marginTop: 14,
          backgroundColor: colors.white,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          ...shadow.card,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>New to Najik?</Text>
          <Text style={{ color: GREEN, fontWeight: "800", marginTop: 4, fontSize: 14 }}>Create an account &gt;</Text>
        </View>
        <HouseTreesMark size={78} />
      </PressScale>
    </KeyboardScreen>
  );
}
