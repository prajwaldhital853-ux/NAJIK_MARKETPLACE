import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { uuidFromNorm } from "../inboxBridge";

const GREEN = "#1B7D2C";

function roomName(threadId: string) {
  return `najik_${uuidFromNorm(threadId).replace(/-/g, "")}`;
}

export function VoiceCallScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const threadId = String(route.params?.threadId ?? "");
  const otherName = String(route.params?.otherName ?? "Contact");
  const uri = useMemo(() => {
    const room = roomName(threadId);
    const config = [
      "config.prejoinPageEnabled=false",
      "config.startWithAudioMuted=false",
      "config.startWithVideoMuted=true",
      "config.disableDeepLinking=true",
      "interfaceConfig.APP_NAME=NAJIK",
      "interfaceConfig.SHOW_JITSI_WATERMARK=false",
      "interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false",
    ].join("&");
    return `https://meet.jit.si/${room}#${config}`;
  }, [threadId]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1D2A" }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 14,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#0F172A",
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
            Online call · {otherName}
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>Voice call through NAJIK</Text>
        </View>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN }} />
      </View>

      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: "#0B1D2A" }}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B1D2A" }}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={{ color: "#94A3B8", marginTop: 12, fontWeight: "600" }}>Connecting call…</Text>
          </View>
        )}
      />
    </View>
  );
}
