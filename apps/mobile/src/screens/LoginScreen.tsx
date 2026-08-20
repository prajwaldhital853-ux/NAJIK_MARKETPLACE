import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StatusBar, Text, View } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleMark } from "../components/GoogleMark";
import { GoogleSignInModal } from "../components/GoogleSignInModal";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { ApiError, friendlyError } from "../api";
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from "../config";
import { useAuth } from "../context/AuthContext";
import { takeLoginHint } from "../loginHint";
import { colors } from "../theme";

const GREEN = "#1B7D2C";
const buyerHero = require("../../assets/buyer-hero.png");
const sellerHero = require("../../assets/seller-hero.png");
const buyerTaglineCurve = require("../../assets/buyer-tagline-curve.png");
const buyerCornerArt = require("../../assets/buyer-corner.png");
const buyerCornerBottomArt = require("../../assets/buyer-corner-bottom.png");
const { width: PAGE_W } = Dimensions.get("window");

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { loginGoogle } = useAuth();
  const pager = useRef<ScrollView>(null);
  const hint = takeLoginHint();
  const [page, setPage] = useState(route.params?.page === "provider" ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(hint.message || "");
  const [googleOpen, setGoogleOpen] = useState(false);

  useEffect(() => {
    if (route.params?.page === "provider") {
      setTimeout(() => pager.current?.scrollTo({ x: PAGE_W, animated: false }), 0);
    }
  }, [route.params?.page]);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setHidden(true, "fade");
      if (Platform.OS === "android") {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor("transparent");
      }
      // Do not un-hide on blur — the next screen owns the status bar.
      // Restoring here races ProviderRegister / other immersive screens and flashes the bar.
    }, []),
  );

  async function finishGoogle(code: string) {
    setGoogleOpen(false);
    setBusy(true);
    setNotice("");
    try {
      await loginGoogle({ code, redirectUri: GOOGLE_REDIRECT_URI }, "user");
    } catch (err) {
      if (err instanceof ApiError && err.code === "use_provider_login") {
        setNotice(err.message);
        goPage(1);
      } else {
        Alert.alert("Google", friendlyError(err, "Could not continue with Google."));
      }
    } finally {
      setBusy(false);
    }
  }

  function goPage(next: number) {
    pager.current?.scrollTo({ x: next * PAGE_W, animated: true });
    setPage(next);
  }

  function onPagerScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / PAGE_W);
    if (next !== page) setPage(next);
  }

  async function onGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      Alert.alert("Google", "Add EXPO_PUBLIC_GOOGLE_CLIENT_ID and restart Expo.");
      return;
    }
    setGoogleOpen(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ExpoStatusBar hidden />
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerScroll}
        keyboardShouldPersistTaps="always"
        style={{ flex: 1 }}
      >
        <BuyerPage
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
          busy={busy}
          notice={page === 0 ? notice : ""}
          onGoogle={() => void onGoogle()}
        />
        <SellerPage
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
          notice={page === 1 ? notice : ""}
          onBack={() => goPage(0)}
          onRegister={() => navigation.navigate("ProviderRegister")}
          onLogin={() => navigation.navigate("SellerLogin")}
        />
      </ScrollView>
      <GoogleSignInModal visible={googleOpen} onClose={() => setGoogleOpen(false)} onCode={(code) => void finishGoogle(code)} />
    </View>
  );
}

function BuyerPage({
  insetsTop,
  insetsBottom,
  busy,
  notice,
  onGoogle,
}: {
  insetsTop: number;
  insetsBottom: number;
  busy: boolean;
  notice: string;
  onGoogle: () => void;
}) {
  return (
    <View style={{ width: PAGE_W, flex: 1 }}>
      <BuyerCornerTop />
      <BuyerCornerBottom />
      <ScrollView
        contentContainerStyle={{ paddingTop: 44, paddingBottom: insetsBottom + 10, paddingHorizontal: 22, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader large showCurve />
        <View style={{ marginTop: 14, alignItems: "center", justifyContent: "center" }}>
          <Image source={buyerHero} style={{ width: "100%", height: 320 }} resizeMode="contain" />
        </View>
        <Text style={{ marginTop: 8, fontSize: 42, fontWeight: "900", color: colors.text, textAlign: "center", lineHeight: 46 }}>
          Your app for
        </Text>
        <Text style={{ marginTop: 0, fontSize: 50, fontWeight: "900", color: GREEN, textAlign: "center", lineHeight: 52 }}>
          fair deal
        </Text>
        <Text style={{ marginTop: 10, color: colors.textSecondary, textAlign: "center", fontSize: 18 }}>
          Choose listings that are right for you.
        </Text>
        <Dots active={0} />
        {notice ? <Text style={{ marginTop: 10, color: colors.red, textAlign: "center", fontWeight: "700" }}>{notice}</Text> : null}
        <PressScale
          onPress={onGoogle}
          disabled={busy}
          style={{
            marginTop: 22,
            backgroundColor: "#111111",
            borderRadius: 28,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <View style={{ position: "absolute", left: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <GoogleMark size={16} />
          </View>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{busy ? "Continuing…" : "Continue with Google"}</Text>
        </PressScale>
        <TrustFooter text="Safe. Reliable. Trusted by thousands." />
      </ScrollView>
    </View>
  );
}

function SellerPage({
  insetsTop,
  insetsBottom,
  notice,
  onBack,
  onRegister,
  onLogin,
}: {
  insetsTop: number;
  insetsBottom: number;
  notice: string;
  onBack: () => void;
  onRegister: () => void;
  onLogin: () => void;
}) {
  return (
    <View style={{ width: PAGE_W, flex: 1 }}>
      <BuyerCornerTop />
      <BuyerCornerBottom />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insetsBottom + 16, paddingHorizontal: 22, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <PressScale onPress={onBack} style={{ width: 40, height: 40, justifyContent: "center", marginBottom: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </PressScale>
        <BrandHeader large />
        <View style={{ marginTop: 4, alignItems: "center", justifyContent: "center" }}>
          <Image source={sellerHero} style={{ width: "100%", height: 290 }} resizeMode="contain" />
        </View>
        <TrustChipsRow />
        <Text style={{ marginTop: 10, fontSize: 32, fontWeight: "900", color: colors.text, textAlign: "center", lineHeight: 36 }}>
          Join as a
        </Text>
        <Text style={{ marginTop: 0, fontSize: 38, fontWeight: "900", color: GREEN, textAlign: "center", lineHeight: 42 }}>
          Service Provider
        </Text>
        <Text style={{ marginTop: 8, color: colors.textSecondary, textAlign: "center", fontSize: 15, lineHeight: 22 }}>
          Grow your business, get more customers and be part of NAJIK's trusted network.
        </Text>
        <Dots active={1} />
        {notice ? <Text style={{ marginTop: 10, color: colors.red, textAlign: "center", fontWeight: "700" }}>{notice}</Text> : null}
        <PressScale onPress={onRegister} style={{ marginTop: 16, borderRadius: 14, overflow: "hidden" }}>
          <LinearGradient colors={[GREEN, "#2FA24A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Register as Service Provider</Text>
          </LinearGradient>
        </PressScale>
        <PressScale
          onPress={onLogin}
          style={{
            marginTop: 10,
            height: 54,
            borderRadius: 14,
            borderWidth: 1.7,
            borderColor: "#111827",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "#fff",
          }}
        >
          <Ionicons name="arrow-back" size={16} color="#111827" />
          <Text style={{ color: "#111827", fontWeight: "800", fontSize: 14 }}>Login to your existing account</Text>
        </PressScale>
        <TrustFooter text="Safe. Secure. Always with you." />
      </ScrollView>
    </View>
  );
}

function BrandHeader({ large = false, showCurve = false }: { large?: boolean; showCurve?: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <NajikWordmark scale={large ? 1 : 0.86} showTagline={false} />
      <Tagline showCurve={showCurve} compact={!large} />
    </View>
  );
}

function Tagline({ showCurve = false, compact = false }: { showCurve?: boolean; compact?: boolean }) {
  const curveW = compact ? 156 : 196;
  return (
    <View style={{ marginTop: compact ? 6 : 4, alignItems: "center" }}>
      <Text style={{ color: "#101828", fontSize: compact ? 15 : 16, fontWeight: "800" }}>
        Everything Near You, <Text style={{ color: GREEN }}>One App.</Text>
      </Text>
      {showCurve ? (
        <Image source={buyerTaglineCurve} style={{ marginTop: 2, width: curveW, height: 14 }} resizeMode="contain" />
      ) : null}
    </View>
  );
}

function Dots({ active }: { active: 0 | 1 }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 14 }}>
      <View style={{ width: active === 0 ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: active === 0 ? GREEN : "#D1D5DB" }} />
      <View style={{ width: active === 1 ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: active === 1 ? GREEN : "#D1D5DB" }} />
    </View>
  );
}

function TrustChipsRow() {
  return (
    <View
      style={{
        marginTop: 8,
        marginHorizontal: 36,
        borderWidth: 1.2,
        borderColor: "#B7E8B5",
        borderRadius: 14,
        backgroundColor: "#F4FBF4",
        flexDirection: "row",
        paddingVertical: 8,
        paddingHorizontal: 4,
      }}
    >
      <TrustChip icon="shield-checkmark" label={"Verified\nProviders"} />
      <View style={{ width: 1, backgroundColor: "#D3EFCF", marginVertical: 4 }} />
      <TrustChip icon="star" label={"High\nRatings"} />
      <View style={{ width: 1, backgroundColor: "#D3EFCF", marginVertical: 4 }} />
      <TrustChip icon="people" label={"Trusted by\nUsers"} />
    </View>
  );
}

function TrustChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: GREEN,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={{ fontSize: 12, lineHeight: 14, textAlign: "center", color: "#1F2937", fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function TrustFooter({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 22 }}>
      <Ionicons name="checkmark-circle" size={16} color={GREEN} />
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

function BuyerCornerTop() {
  const size = 148;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size, zIndex: 2 }}>
      <Image source={buyerCornerArt} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

function BuyerCornerBottom() {
  const size = 88;
  return (
    <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: 0, width: size, height: size, zIndex: 2 }}>
      <Image source={buyerCornerBottomArt} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}
