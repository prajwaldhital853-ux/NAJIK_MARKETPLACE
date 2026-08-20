import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Dimensions, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthImage } from "./AuthImage";
import { PressScale } from "./PressScale";
import { useAuth } from "../context/AuthContext";
import { fetchActiveNotices, type AppNotice } from "../noticesApi";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const BETWEEN_MS = 320;

export function AppNoticeHost() {
  const { user, loading } = useAuth();
  const [queue, setQueue] = useState<AppNotice[]>([]);
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(new Set<string>());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userKey = user ? `${user.id}:${user.account_type}` : "";

  const current = queue[0] || null;

  const load = useCallback(async () => {
    if (!user) {
      setQueue([]);
      setVisible(false);
      return;
    }
    try {
      const rows = await fetchActiveNotices();
      setQueue(rows.filter((row) => row.is_active && !dismissed.current.has(row.id)));
    } catch {
      /* keep quiet offline */
    }
  }, [user]);

  useEffect(() => {
    dismissed.current.clear();
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setVisible(false);
    if (!user || loading) {
      setQueue([]);
      return;
    }
    void load();
  }, [userKey, loading, load, user]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && user) void load();
    });
    return () => sub.remove();
  }, [load, user]);

  useEffect(() => {
    if (!current) {
      setVisible(false);
      return;
    }
    const openTimer = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(openTimer);
  }, [current?.id]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  function dismiss() {
    if (!current) return;
    const id = current.id;
    dismissed.current.add(id);
    setVisible(false);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      setQueue((prev) => prev.filter((row) => row.id !== id));
    }, BETWEEN_MS);
  }

  if (!current) return null;
  return <AppNoticeModal key={current.id} notice={current} visible={visible} onDismiss={dismiss} />;
}

function AppNoticeModal({
  notice,
  visible,
  onDismiss,
}: {
  notice: AppNotice;
  visible: boolean;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [fullscreen, setFullscreen] = useState(false);
  const win = Dimensions.get("window");

  useEffect(() => {
    setFullscreen(false);
  }, [notice.id]);

  return (
    <>
      <Modal visible={visible && !fullscreen} transparent animationType="fade" onRequestClose={onDismiss}>
        <Pressable
          onPress={onDismiss}
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            justifyContent: "center",
            paddingHorizontal: 22,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              overflow: "hidden",
              maxHeight: "86%",
              ...shadow.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="notifications" size={18} color={GREEN} />
              </View>
              <Text style={{ flex: 1, marginLeft: 10, fontWeight: "800", fontSize: 13, color: GREEN }}>NAJIK notice</Text>
              <Pressable onPress={onDismiss} hitSlop={12} style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>

            <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18 }}>
              {notice.image_uri ? (
                <Pressable
                  onPress={() => setFullscreen(true)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="View full screen image"
                  style={{ marginBottom: 12 }}
                >
                  <AuthImage
                    uri={notice.image_uri}
                    style={{ width: win.width - 76, height: 200, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      right: 10,
                      bottom: 10,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "rgba(15, 23, 42, 0.55)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="expand" size={16} color="#fff" />
                  </View>
                </Pressable>
              ) : null}
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.navy }}>{notice.title}</Text>
              {notice.body ? (
                <Text style={{ marginTop: 10, fontSize: 15, lineHeight: 22, color: colors.text }}>{notice.body}</Text>
              ) : null}
              <PressScale
                onPress={onDismiss}
                style={{
                  marginTop: 18,
                  backgroundColor: GREEN,
                  borderRadius: 14,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Got it</Text>
              </PressScale>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <Pressable
            onPress={() => setFullscreen(false)}
            hitSlop={12}
            style={{
              position: "absolute",
              top: insets.top + 8,
              right: 14,
              zIndex: 2,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Pressable style={{ flex: 1, justifyContent: "center", alignItems: "center" }} onPress={() => setFullscreen(false)}>
            {notice.image_uri ? (
              <AuthImage
                uri={notice.image_uri}
                style={{ width: win.width, height: win.height - insets.top - insets.bottom - 24 }}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
