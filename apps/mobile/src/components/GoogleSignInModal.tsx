import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from "../config";
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

export function googleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function googleResultFromUrl(url: string): { code?: string; error?: string } | null {
  const base = GOOGLE_REDIRECT_URI.replace(/\/$/, "");
  if (!url || !url.startsWith(base)) return null;
  const raw = url.replace(/#/, "?");
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  if (!query) return null;
  const params = new URLSearchParams(query);
  const code = params.get("code") || undefined;
  const error = params.get("error") || undefined;
  if (!code && !error) return null;
  return { code, error };
}

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

  function capture(url: string) {
    if (done.current) return;
    const hit = googleResultFromUrl(url);
    if (!hit) return;
    if (hit.error) {
      done.current = true;
      onClose();
      return;
    }
    if (!hit.code || codeSent.current === hit.code) return;
    done.current = true;
    codeSent.current = hit.code;
    onCode(hit.code);
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
                source={{ uri: googleAuthUrl() }}
                style={{ flex: 1, backgroundColor: colors.white }}
                onShouldStartLoadWithRequest={(req) => {
                  capture(req.url);
                  return !googleResultFromUrl(req.url);
                }}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
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
