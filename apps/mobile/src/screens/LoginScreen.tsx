import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
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
const { width: PAGE_W, height: PAGE_H } = Dimensions.get("window");

function brandBlockHeight(scale: number, taglineSize: number, withCurve: boolean) {
  const markW = 112 * scale;
  const markH = markW * (550 / 653);
  const wordW = 280 * scale;
  const cropH = wordW * (250 / 996) * 0.7;
  const curveH = withCurve ? Math.round(10 + 3 * scale) + 1 : 0;
  return Math.round(markH + 4 + cropH + 4 + taglineSize + 4 + curveH);
}

/** Scale art + type to the usable screen so CTAs stay on-screen without vertical scroll. */
function loginMetrics(insetsTop: number, insetsBottom: number) {
  const usable = Math.max(520, PAGE_H - Math.max(insetsTop, 8) - Math.max(insetsBottom, 8));
  const s = Math.min(1, Math.max(0.68, usable / 780));
  const padTop = insetsTop + Math.max(8, Math.round(10 * s));
  const padBottom = Math.max(insetsBottom, 10) + 6;
  const contentH = PAGE_H - padTop - padBottom;
  const brandScale = Math.min(0.82, 0.56 + 0.22 * s);
  const tagline = Math.round(13 + 2 * s);
  const title = Math.round(34 * s);
  const titleAccent = Math.round(40 * s);
  const titleLine = Math.round(38 * s);
  const titleAccentLine = Math.round(44 * s);
  const sellerTitle = Math.round(26 * s);
  const sellerAccent = Math.round(30 * s);
  const sellerLine = Math.round(30 * s);
  const sellerAccentLine = Math.round(34 * s);
  const sub = Math.round(14 + 3 * s);
  const btnH = Math.round(48 + 4 * s);
  const btnR = Math.round(14 + 10 * s);
  const dotsGap = Math.round(6 + 2 * s);
  const gapBeforeBtn = Math.round(6 + 6 * s);
  const sectionGap = Math.round(4 + 2 * s);
  const compact = s < 0.82;

  const brandH = brandBlockHeight(brandScale, tagline, true);
  const buyerBottomH = Math.round(
    titleLine +
      titleAccentLine +
      4 +
      sub +
      4 +
      dotsGap +
      6 +
      gapBeforeBtn +
      btnH +
      (compact ? 8 : 10) +
      14 +
      10,
  );

  const minHero = Math.round(contentH * 0.16);
  const maxHero = Math.round(contentH * 0.34);
  let buyerHeroH = Math.round(contentH - brandH - buyerBottomH - sectionGap * 2);
  buyerHeroH = Math.max(minHero, Math.min(maxHero, buyerHeroH));

  let extra = contentH - brandH - buyerHeroH - buyerBottomH - sectionGap * 2;
  if (extra > 0 && buyerHeroH < maxHero) {
    const grow = Math.min(extra, maxHero - buyerHeroH);
    buyerHeroH += grow;
    extra -= grow;
  }

  const gapAfterBrand = sectionGap + Math.round(extra * 0.45);
  let gapAfterHero = sectionGap + Math.round(extra * 0.55);

  let buyerTotal = brandH + gapAfterBrand + buyerHeroH + gapAfterHero + buyerBottomH;
  if (buyerTotal > contentH) {
    const overflow = buyerTotal - contentH;
    buyerHeroH = Math.max(minHero, buyerHeroH - overflow);
    buyerTotal = brandH + gapAfterBrand + buyerHeroH + gapAfterHero + buyerBottomH;
    if (buyerTotal > contentH) {
      gapAfterHero = Math.max(2, gapAfterHero - (buyerTotal - contentH));
    }
  }

  const sellerBrandH = brandBlockHeight(brandScale * 0.95, tagline, false) + 36;
  const chipsH = compact ? 58 : 68;
  const sellerBottomH = Math.round(
    chipsH +
      gapBeforeBtn +
      sellerLine +
      sellerAccentLine +
      6 +
      Math.max(16, sub + 4) +
      10 +
      dotsGap +
      6 +
      gapBeforeBtn +
      btnH +
      8 +
      btnH +
      (compact ? 8 : 10) +
      14 +
      12,
  );
  let sellerHeroH = Math.round(contentH - sellerBrandH - sellerBottomH - sectionGap * 2);
  sellerHeroH = Math.max(Math.round(contentH * 0.14), Math.min(Math.round(contentH * 0.28), sellerHeroH));

  return {
    s,
    padTop,
    padBottom,
    brandScale,
    buyerHeroH,
    gapAfterBrand,
    gapAfterHero,
    heroH: sellerHeroH,
    title,
    titleAccent,
    titleLine,
    titleAccentLine,
    sellerTitle,
    sellerAccent,
    sellerLine,
    sellerAccentLine,
    sub,
    tagline,
    btnH,
    btnR,
    cornerTop: Math.round(90 + 40 * s),
    chipIcon: Math.round(26 + 6 * s),
    gapAfterHero: gapAfterHero,
    gapBeforeBtn,
    dotsGap,
    sectionGap,
  };
}

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
  const metrics = useMemo(() => loginMetrics(insets.top, insets.bottom), [insets.top, insets.bottom]);

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
        bounces={false}
      >
        <BuyerPage
          metrics={metrics}
          busy={busy}
          notice={page === 0 ? notice : ""}
          onGoogle={() => void onGoogle()}
        />
        <SellerPage
          metrics={metrics}
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

type Metrics = ReturnType<typeof loginMetrics>;

function BuyerPage({
  metrics,
  busy,
  notice,
  onGoogle,
}: {
  metrics: Metrics;
  busy: boolean;
  notice: string;
  onGoogle: () => void;
}) {
  return (
    <View style={{ width: PAGE_W, height: PAGE_H, overflow: "hidden" }}>
      <BuyerCornerTop size={metrics.cornerTop} />
      <View
        style={{
          flex: 1,
          paddingTop: metrics.padTop,
          paddingBottom: metrics.padBottom,
          paddingHorizontal: 22,
        }}
      >
        <BrandHeader scale={metrics.brandScale} taglineSize={metrics.tagline} showCurve />
        <View style={{ height: metrics.buyerHeroH, marginTop: metrics.gapAfterBrand, alignItems: "center", justifyContent: "center" }}>
          <Image source={buyerHero} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
        </View>
        <View style={{ marginTop: metrics.gapAfterHero, flexShrink: 0 }}>
        <Text
          style={{
            fontSize: metrics.title,
            fontWeight: "900",
            color: colors.text,
            textAlign: "center",
            lineHeight: metrics.titleLine,
          }}
        >
          Your app for
        </Text>
        <Text
          style={{
            fontSize: metrics.titleAccent,
            fontWeight: "900",
            color: GREEN,
            textAlign: "center",
            lineHeight: metrics.titleAccentLine,
          }}
        >
          fair deal
        </Text>
        <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: "center", fontSize: metrics.sub }}>
          Choose listings that are right for you.
        </Text>
        <Dots active={0} gap={metrics.dotsGap} />
        {notice ? <Text style={{ marginTop: 6, color: colors.red, textAlign: "center", fontWeight: "700", fontSize: 12 }}>{notice}</Text> : null}
        <PressScale
          onPress={onGoogle}
          disabled={busy}
          style={{
            marginTop: metrics.gapBeforeBtn,
            backgroundColor: "#111111",
            borderRadius: metrics.btnR,
            height: metrics.btnH,
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
        <TrustFooter text="Safe. Reliable. Trusted by thousands." compact={metrics.s < 0.82} />
        </View>
      </View>
    </View>
  );
}

function SellerPage({
  metrics,
  notice,
  onBack,
  onRegister,
  onLogin,
}: {
  metrics: Metrics;
  notice: string;
  onBack: () => void;
  onRegister: () => void;
  onLogin: () => void;
}) {
  return (
    <View style={{ width: PAGE_W, height: PAGE_H, overflow: "hidden" }}>
      <BuyerCornerTop size={metrics.cornerTop} />
      <View
        style={{
          flex: 1,
          paddingTop: metrics.padTop,
          paddingBottom: metrics.padBottom,
          paddingHorizontal: 22,
        }}
      >
        <PressScale onPress={onBack} hitSlop={10} style={{ width: 36, height: 32, justifyContent: "center", zIndex: 3 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </PressScale>
        <BrandHeader scale={metrics.brandScale * 0.95} taglineSize={metrics.tagline} />
        <View style={{ height: metrics.heroH, marginTop: metrics.sectionGap, alignItems: "center", justifyContent: "center" }}>
          <Image source={sellerHero} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
        </View>
        <TrustChipsRow chipIcon={metrics.chipIcon} compact={metrics.s < 0.85} />
        <Text
          style={{
            marginTop: metrics.gapAfterHero,
            fontSize: metrics.sellerTitle,
            fontWeight: "900",
            color: colors.text,
            textAlign: "center",
            lineHeight: metrics.sellerLine,
          }}
        >
          Join as a
        </Text>
        <Text
          style={{
            fontSize: metrics.sellerAccent,
            fontWeight: "900",
            color: GREEN,
            textAlign: "center",
            lineHeight: metrics.sellerAccentLine,
          }}
        >
          Service Provider
        </Text>
        <Text
          style={{
            marginTop: 6,
            color: colors.textSecondary,
            textAlign: "center",
            fontSize: Math.max(12, metrics.sub - 1),
            lineHeight: Math.max(16, metrics.sub + 4),
            paddingHorizontal: 4,
          }}
          numberOfLines={2}
        >
          Grow your business, get more customers and be part of NAJIK's trusted network.
        </Text>
        <Dots active={1} />
        {notice ? <Text style={{ marginTop: 8, color: colors.red, textAlign: "center", fontWeight: "700", fontSize: 12 }}>{notice}</Text> : null}
        <PressScale onPress={onRegister} style={{ marginTop: metrics.gapBeforeBtn, borderRadius: 14, overflow: "hidden" }}>
          <LinearGradient
            colors={[GREEN, "#2FA24A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: metrics.btnH, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Register as Service Provider</Text>
          </LinearGradient>
        </PressScale>
        <PressScale
          onPress={onLogin}
          style={{
            marginTop: 8,
            height: metrics.btnH,
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
          <Text style={{ color: "#111827", fontWeight: "800", fontSize: 13 }}>Login to your existing account</Text>
        </PressScale>
        <TrustFooter text="Safe. Secure. Always with you." />
      </View>
    </View>
  );
}

function BrandHeader({ scale, taglineSize, showCurve = false }: { scale: number; taglineSize: number; showCurve?: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <NajikWordmark scale={scale} showTagline={false} />
      <Tagline showCurve={showCurve} size={taglineSize} scale={scale} />
    </View>
  );
}

function Tagline({ showCurve = false, size, scale }: { showCurve?: boolean; size: number; scale: number }) {
  const curveW = Math.round(150 + 40 * scale);
  return (
    <View style={{ marginTop: 4, alignItems: "center" }}>
      <Text style={{ color: "#101828", fontSize: size, fontWeight: "800" }}>
        Everything Near You, <Text style={{ color: GREEN }}>One App.</Text>
      </Text>
      {showCurve ? (
        <Image source={buyerTaglineCurve} style={{ marginTop: 1, width: curveW, height: Math.round(10 + 3 * scale) }} resizeMode="contain" />
      ) : null}
    </View>
  );
}

function Dots({ active, gap = 10 }: { active: 0 | 1; gap?: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: gap }}>
      <View style={{ width: active === 0 ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: active === 0 ? GREEN : "#D1D5DB" }} />
      <View style={{ width: active === 1 ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: active === 1 ? GREEN : "#D1D5DB" }} />
    </View>
  );
}

function TrustChipsRow({ chipIcon, compact }: { chipIcon: number; compact: boolean }) {
  return (
    <View
      style={{
        marginTop: 4,
        marginHorizontal: compact ? 12 : 28,
        borderWidth: 1.2,
        borderColor: "#B7E8B5",
        borderRadius: 12,
        backgroundColor: "#F4FBF4",
        flexDirection: "row",
        paddingVertical: compact ? 6 : 8,
        paddingHorizontal: 4,
      }}
    >
      <TrustChip icon="shield-checkmark" label={"Verified\nProviders"} size={chipIcon} compact={compact} />
      <View style={{ width: 1, backgroundColor: "#D3EFCF", marginVertical: 4 }} />
      <TrustChip icon="star" label={"High\nRatings"} size={chipIcon} compact={compact} />
      <View style={{ width: 1, backgroundColor: "#D3EFCF", marginVertical: 4 }} />
      <TrustChip icon="people" label={"Trusted by\nUsers"} size={chipIcon} compact={compact} />
    </View>
  );
}

function TrustChip({
  icon,
  label,
  size,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  size: number;
  compact: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: GREEN,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={Math.round(size * 0.5)} color="#fff" />
      </View>
      <Text style={{ fontSize: compact ? 10 : 11, lineHeight: compact ? 12 : 13, textAlign: "center", color: "#1F2937", fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

function TrustFooter({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: compact ? 8 : 10 }}>
      <Ionicons name="checkmark-circle" size={14} color={GREEN} />
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

function BuyerCornerTop({ size }: { size: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size, zIndex: 2 }}>
      <Image source={buyerCornerArt} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}
