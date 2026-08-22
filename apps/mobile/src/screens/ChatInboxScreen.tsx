import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { AuthImage } from "../components/AuthImage";
import { KeyboardScreen } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { listChatThreads, type ChatThread } from "../chatApi";
import { useInbox } from "../context/InboxContext";
import { subscribeAppRefresh } from "../listingsRefresh";
import { openChatThread } from "../navigation/browse";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

function previewLastMessage(row: ChatThread) {
  const msg = row.last_message;
  if (!msg) return "No messages yet";
  const raw = (msg.text || "").trim();
  if (msg.kind === "booking" || raw.startsWith("{")) {
    try {
      const data = JSON.parse(raw);
      if (data?.type === "booking" || data?.item || data?.status) {
        const item = data.item || "Visit";
        const status = data.status || "pending";
        return `Booking: ${item} · ${status}`;
      }
    } catch {
      if (msg.kind === "booking") return "Booking request";
    }
  }
  if (msg.kind === "image") return raw || "Photo";
  if (msg.kind === "voice") return raw || "Voice message";
  if (msg.kind === "location") return raw || "Shared location";
  return raw || "No messages yet";
}

function rel(iso?: string | null) {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const m = Math.round(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function ChatInboxList({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<ChatThread[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await listChatThreads());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load chats.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const id = setInterval(() => void load(), 8000);
      const stop = subscribeAppRefresh(() => void load());
      return () => {
        clearInterval(id);
        stop();
      };
    }, [load]),
  );

  if (error && items.length === 0) {
    return <Text style={{ color: colors.red, padding: 16 }}>{error}</Text>;
  }

  if (items.length === 0) {
    return (
      <View style={{ margin: 16, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 48, paddingHorizontal: 20, alignItems: "center", ...shadow.card }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chatbubbles-outline" size={28} color={GREEN} />
        </View>
        <Text style={{ fontWeight: "800", fontSize: 16, marginTop: 14, color: "#111827" }}>No chats yet</Text>
        <Text style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 }}>
          Private chats stay between you and the other person on that listing. Open a listing and tap Start a chat.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 10 }}>
      {items.map((row) => (
        <PressScale
          key={row.id}
          onPress={() => onOpen(row.id)}
          style={{ backgroundColor: "#fff", borderRadius: 16, padding: 12, flexDirection: "row", gap: 10, ...shadow.card }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
            {row.listing_photo ? <AuthImage uri={row.listing_photo} style={{ width: 52, height: 52 }} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontWeight: "800", fontSize: 14, flex: 1 }} numberOfLines={1}>
                {row.other.full_name}
              </Text>
              {row.other.online ? (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />
              ) : null}
              <Text style={{ color: "#9AA0A6", fontSize: 11 }}>{rel(row.last_message?.created_at || row.updated_at)}</Text>
            </View>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {row.listing_title}
            </Text>
            <Text style={{ color: "#111827", fontSize: 13, marginTop: 4 }} numberOfLines={1}>
              {previewLastMessage(row)}
            </Text>
          </View>
          {row.unread_count ? (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, alignSelf: "center" }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{row.unread_count}</Text>
            </View>
          ) : null}
        </PressScale>
      ))}
    </View>
  );
}

export function ChatInboxScreen() {
  const navigation = useNavigation<any>();
  const { dismissTarget, refresh } = useInbox();
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader onClose={() => navigation.goBack()} />
      <KeyboardScreen adjustKeyboardInsets={false} fill={false} contentStyle={{ paddingBottom: 24 }}>
        <ChatInboxList
          onOpen={(id) => {
            void dismissTarget({ target: "chat", target_id: id, kind: "message" }).then(() => refresh());
            openChatThread(navigation, id);
          }}
        />
      </KeyboardScreen>
    </View>
  );
}
