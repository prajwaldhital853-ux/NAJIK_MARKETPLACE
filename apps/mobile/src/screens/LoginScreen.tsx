import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState, type ReactNode } from "react";
import { Image, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CitySkyline } from "../components/CitySkyline";
import { GoogleMark } from "../components/GoogleMark";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { ServiceCategoryBar } from "../components/ServiceCategoryBar";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";

const trees = require("../../assets/login-trees.png");

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");

  function signIn() {
    void login({ phone: phone.replace(/\s/g, "") || undefined });
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.white }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 10 }}>
        <PressScale onPress={() => navigation.goBack()} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
          <Text style={{ fontWeight: "700" }}>Back</Text>
        </PressScale>
        <View style={{ alignItems: "center" }}>
          <Animated.View entering={FadeIn.duration(450)}>
            <NajikWordmark />
          </Animated.View>
          <View style={{ width: "100%", marginTop: 10 }}>
            <ServiceCategoryBar />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 2 }}>
        <CitySkyline />
      </View>

      <Animated.View
        entering={FadeInUp.delay(140).springify()}
        style={{
          backgroundColor: colors.white,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -36,
          paddingHorizontal: 22,
          paddingTop: 26,
          paddingBottom: 18,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.navy, textAlign: "center" }}>Welcome Back!</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 6, textAlign: "center", fontSize: 14 }}>Login to continue to Najik</Text>
        <LoginForm phone={phone} setPhone={setPhone} onContinue={signIn} />
      </Animated.View>

      <PressScale
        onPress={() => navigation.navigate("Register")}
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          backgroundColor: colors.white,
          borderRadius: 16,
          paddingVertical: 14,
          paddingLeft: 16,
          paddingRight: 10,
          flexDirection: "row",
          alignItems: "center",
          ...shadow.card,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: colors.navy }}>New to Najik?</Text>
          <Text style={{ color: colors.green, fontWeight: "700", marginTop: 2 }}>Create an account  ›</Text>
        </View>
        <Image source={trees} style={{ width: 92, height: 64, borderRadius: 10 }} resizeMode="cover" />
      </PressScale>
    </KeyboardScreen>
  );
}

function LoginForm({
  phone,
  setPhone,
  onContinue,
}: {
  phone: string;
  setPhone: (value: string) => void;
  onContinue: () => void;
}) {
  const { onInputFocus } = useKeyboardScroll();

  return (
    <View style={{ paddingTop: 10 }}>
      <SocialButton onPress={onContinue} background={colors.greenDeep} labelColor="#fff" icon={<GoogleBadge />}>
        Continue with Google
      </SocialButton>
      <SocialButton
        onPress={onContinue}
        background={colors.white}
        labelColor={colors.navy}
        border
        icon={<Ionicons name="logo-apple" size={22} color={colors.navy} />}
      >
        Continue with Apple
      </SocialButton>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ color: colors.muted, fontSize: 12 }}>or continue with</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          height: 50,
          gap: 8,
        }}
      >
        <Ionicons name="phone-portrait-outline" size={18} color={colors.green} />
        <Text style={{ fontWeight: "700", color: colors.text }}>+977</Text>
        <Ionicons name="chevron-down" size={14} color={colors.muted} />
        <View style={{ width: 1, height: 22, backgroundColor: colors.border }} />
        <TextInput
          placeholder="Enter your phone number"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          onFocus={onInputFocus}
          style={{ flex: 1, color: colors.text }}
        />
      </View>

      <PressScale
        onPress={onContinue}
        style={{
          marginTop: 14,
          backgroundColor: colors.greenMint,
          borderRadius: 28,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text style={{ color: colors.greenDark, fontWeight: "800", fontSize: 16 }}>Continue with Phone</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.greenDark} />
      </PressScale>

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginTop: 14, gap: 6, paddingHorizontal: 8 }}>
        <Ionicons name="lock-closed-outline" size={12} color={colors.muted} style={{ marginTop: 2 }} />
        <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16, flexShrink: 1 }}>
          By continuing, you agree to our{"\n"}
          <Text style={{ color: colors.green, fontWeight: "700" }}>Terms of Service</Text>
          {" and "}
          <Text style={{ color: colors.green, fontWeight: "700" }}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

function GoogleBadge() {
  return (
    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      <GoogleMark size={16} />
    </View>
  );
}

function SocialButton({
  onPress,
  background,
  labelColor,
  icon,
  children,
  border,
}: {
  onPress: () => void;
  background: string;
  labelColor: string;
  icon: ReactNode;
  children: string;
  border?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        marginTop: 12,
        height: 52,
        borderRadius: 26,
        backgroundColor: background,
        justifyContent: "center",
        borderWidth: border ? 1 : 0,
        borderColor: "#D8DCE2",
      }}
    >
      <View style={{ position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center" }}>{icon}</View>
      <Text style={{ textAlign: "center", color: labelColor, fontWeight: "700", fontSize: 16 }}>{children}</Text>
    </PressScale>
  );
}
