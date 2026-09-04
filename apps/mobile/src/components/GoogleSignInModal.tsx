import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewErrorEvent, WebViewNavigation } from "react-native-webview/lib/WebViewTypes";
import { GOOGLE_REDIRECT_URI } from "../config";
import { googleAuthUrl, googleResultFromUrl, isGoogleRedirectUrl } from "../googleAuth";
import { colors, shadow } from "../theme";

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = Math.round(SCREEN_H * 0.92);

const webViewBootstrap = (bottomPad: number) => `
(function () {
  var style = document.createElement("style");
  style.textContent = "html, body { overflow: auto !important; -webkit-overflow-scrolling: touch !important; min-height: 100% !important; padding-bottom: ${Math.max(32, bottomPad)}px !important; }";
  document.head.appendChild(style);
})();
true;
`;

export function GoogleSignInModal({
  visible,
  onClose,
  onCode,
}: {
  visible: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const done = useRef(false);
  const codeSent = useRef("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      done.current = false;
      codeSent.current = "";
      setLoading(true);
    }
  }, [visible]);

  function finishWithError(message: string) {
    if (done.current) return;
    done.current = true;
    onClose();
    Alert.alert("Google sign-in", message);
  }

  function capture(url: string) {
    if (done.current) return;
    const hit = googleResultFromUrl(url, GOOGLE_REDIRECT_URI);
    if (!hit) return;
    if (hit.error) {
      finishWithError("Google sign-in was cancelled or denied.");
      return;
    }
    if (!hit.code || codeSent.current === hit.code) return;
    done.current = true;
    codeSent.current = hit.code;
    onCode(hit.code);
  }

  function onNavChange(nav: WebViewNavigation) {
    capture(nav.url);
  }

  function onShouldStartLoad(url: string) {
    capture(url);
    return !isGoogleRedirectUrl(url, GOOGLE_REDIRECT_URI);
  }

  function onWebError(event: WebViewErrorEvent) {
    const { code, description } = event.nativeEvent;
    const raw = `${description || ""} ${code ?? ""}`.toLowerCase();
    const dnsFail =
      raw.includes("err_name_not_resolved") ||
      raw.includes("err_internet_disconnected") ||
      raw.includes("err_address_unreachable") ||
      raw.includes("err_connection") ||
      code === -2 ||
      code === -6 ||
      code === -8;
    if (dnsFail) {
      finishWithError(
        "The phone could not reach Google (no DNS / no internet). Check Wi‑Fi or mobile data, then try again. This is not a change to the Google login button.",
      );
      return;
    }
    finishWithError(description || "Could not load Google sign-in. Check your internet connection and try again.");
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View
          style={{
            height: SHEET_H,
            backgroundColor: colors.white,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: "hidden",
            ...shadow.card,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              position: "absolute",
              top: insets.top > 0 ? 8 : 12,
              right: 12,
              zIndex: 2,
              backgroundColor: colors.white,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontWeight: "800", color: colors.greenDeep, fontSize: 13 }}>Close</Text>
          </Pressable>

          <View style={{ flex: 1, marginBottom: insets.bottom }}>
            {visible ? (
              <WebView
                source={{ uri: googleAuthUrl(GOOGLE_REDIRECT_URI) }}
                style={{ flex: 1, backgroundColor: colors.white }}
                originWhitelist={["https://*", "http://*"]}
                onShouldStartLoadWithRequest={(req) => onShouldStartLoad(req.url)}
                onNavigationStateChange={onNavChange}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={onWebError}
                onHttpError={(e) => {
                  if (e.nativeEvent.statusCode >= 400) {
                    finishWithError(`Google sign-in page failed (${e.nativeEvent.statusCode}). Try again.`);
                  }
                }}
                injectedJavaScript={webViewBootstrap(insets.bottom + 40)}
                setSupportMultipleWindows={false}
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                nestedScrollEnabled
                scrollEnabled
                overScrollMode="always"
                androidLayerType="hardware"
                contentInsetAdjustmentBehavior="automatic"
                automaticallyAdjustContentInsets={false}
              />
            ) : null}
            {loading ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 12,
                  left: 0,
                  right: 0,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator color={colors.green} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
