import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useInbox, noticeSenderLabel, noticeKindLabel } from "../context/InboxContext";
import { isPendingProvider, isProvider } from "../demo";
import { openBookings, openChatThread, openListing, openSellerPage } from "../navigation/browse";
import { lookupPlace, useBuyerLocation } from "../context/BuyerLocationContext";
import { searchPlaces } from "../geo";
import { colors, shadow } from "../theme";
import { KeyboardScreen, useKeyboardScroll } from "./KeyboardScreen";
import { NajikLogo } from "./NajikLogo";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";

const dotStyle = {
  position: "absolute" as const,
  top: -1,
  right: -1,
  width: 9,
  height: 9,
  borderRadius: 5,
  backgroundColor: "#22C55E",
  borderWidth: 1.5,
  borderColor: "#fff",
};

type Props = {
  right?: "bell" | "bell-chat" | "bell-settings" | "bell-filter" | "draft";
  showLocation?: boolean;
  showPro?: boolean;
  location?: string;
  onClose?: () => void;
  onDraft?: () => void;
  bellCount?: number;
  pinColor?: string;
};

export function AppHeader({
  right = "bell",
  showLocation = false,
  showPro,
  location,
  onClose,
  onDraft,
  bellCount,
  pinColor = "#111827",
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { place, loading } = useBuyerLocation();
  const [picker, setPicker] = useState(false);
  const pro = showPro ?? isProvider(user);
  const pending = isPendingProvider(user);
  const label = place.source === "all" ? "All Nepal" : location || place.label || "All Nepal";

  function openDrawer() {
    const parent = navigation.getParent();
    // @ts-expect-error drawer parent
    parent?.openDrawer?.();
  }

  return (
    <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={12} style={{ zIndex: 2, width: 32 }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
        ) : (
          <Pressable onPress={openDrawer} hitSlop={12} style={{ zIndex: 2, width: 32 }}>
            <Ionicons name="menu" size={26} color="#111827" />
          </Pressable>
        )}

        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, alignItems: "center" }}>
          <NajikLogo size="sm" showTagline={false} layout="row" />
        </View>
        <View style={{ flex: 1 }} />
        {pro ? (
          <View style={{ backgroundColor: pending ? colors.orangeSoft : "#E4F6EA", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: pending ? "#F5C18A" : "#BFE6C9", marginRight: 8 }}>
            <Text style={{ color: pending ? colors.orange : "#146B32", fontSize: 10, fontWeight: "800" }}>
              {pending ? "Pending" : "Service Pro"}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {right === "draft" ? (
            <PressScale onPress={onDraft} style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
              <Ionicons name="save-outline" size={14} color={colors.green} />
              <Text style={{ color: colors.green, fontWeight: "700", fontSize: 12 }}>Save Draft</Text>
            </PressScale>
          ) : (
            <NotificationBell />
          )}
          {right === "bell-chat" ? (
            <Pressable
              onPress={() => {
                const parent = navigation.getParent();
                // @ts-expect-error drawer parent
                (parent || navigation).navigate?.("ChatInbox");
              }}
              hitSlop={10}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.navy} />
            </Pressable>
          ) : null}
          {right === "bell-settings" ? <Ionicons name="settings-outline" size={22} color={colors.navy} /> : null}
          {right === "bell-filter" ? <Ionicons name="options-outline" size={22} color={colors.navy} /> : null}
          {right === "draft" && onClose ? (
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.navy} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {showLocation ? (
        <View style={{ alignItems: "center", paddingBottom: 10 }}>
          <PressScale
            onPress={() => setPicker(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 22,
              gap: 6,
              ...shadow.card,
            }}
          >
            <Ionicons name="location" size={15} color={pinColor} />
            <Text style={{ fontWeight: "700", color: "#111827" }} numberOfLines={1}>
              {label}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#111827" />
          </PressScale>
        </View>
      ) : null}
      <Modal visible={picker} animationType="none" onRequestClose={() => setPicker(false)}>
        <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 18 }}>Search location</Text>
            <Pressable onPress={() => setPicker(false)}>
              <Ionicons name="close" size={22} />
            </Pressable>
          </View>
          <KeyboardScreen enableRefresh={false} contentStyle={{ padding: 16, paddingBottom: 28 }}>
            <LocationPickerBody
              onPicked={() => setPicker(false)}
            />
          </KeyboardScreen>
        </View>
      </Modal>
    </View>
  );
}

function NotificationBell() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, unread, mark, markAll, refresh, dismiss, dismissTarget } = useInbox();
  const [open, setOpen] = useState(false);
  const sheetMax = Math.min(360, Math.round(Dimensions.get("window").height * 0.48));

  async function go(item: (typeof items)[0]) {
    setOpen(false);
    await dismiss(item.id);
    if (item.target === "chat" && item.target_id) {
      await dismissTarget({ target: "chat", target_id: item.target_id, kind: "message" });
      openChatThread(navigation, item.target_id);
      return;
    }
    if (item.target === "listing" && item.target_id) {
      await dismissTarget({ target: "listing", target_id: item.target_id });
      openListing(navigation, item.target_id);
      return;
    }
    if (item.target === "booking" || item.kind === "booking") {
      await dismissTarget({ kind: "booking", target_id: item.target_id || undefined });
      if (isProvider(user)) openSellerPage(navigation, "bookings", { bookingId: item.target_id });
      else openBookings(navigation, item.target_id);
    }
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
          void refresh();
        }}
        hitSlop={10}
      >
        <Ionicons name="notifications-outline" size={22} color="#111827" />
        {unread > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -5,
              right: -7,
              backgroundColor: "#E53935",
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 3,
              borderWidth: 1.5,
              borderColor: "#fff",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{unread > 99 ? "99+" : unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.35)" }} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => undefined}
            style={{
              marginTop: insets.top + 48,
              marginHorizontal: 12,
              backgroundColor: "#fff",
              borderRadius: 18,
              maxHeight: sheetMax + 56,
              overflow: "hidden",
              ...shadow.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ flex: 1, fontWeight: "800", fontSize: 16 }}>Notifications</Text>
              {unread ? (
                <Pressable onPress={() => void markAll()}>
                  <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>
            {items.length ? (
              <View style={{ maxHeight: sheetMax }}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: item.is_read ? "#fff" : "#F0FDF4",
                    borderTopWidth: 1,
                    borderTopColor: "#F3F4F6",
                  }}
                >
                  <Pressable onPress={() => void go(item)}>
                    <Text style={{ color: GREEN, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 }}>
                      {noticeKindLabel(item.kind)}
                    </Text>
                    <Text style={{ fontWeight: "800", color: "#111827", fontSize: 15, marginTop: 2 }}>{noticeSenderLabel(item)}</Text>
                    {item.title && item.title !== noticeSenderLabel(item) && item.title !== "New message" && item.title !== "Notification" ? (
                      <Text style={{ fontWeight: "700", color: "#374151", fontSize: 12, marginTop: 2 }}>{item.title}</Text>
                    ) : null}
                    {item.body ? <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }} numberOfLines={2}>{item.body}</Text> : null}
                  </Pressable>
                  {!item.is_read ? (
                    <Pressable onPress={() => void mark(item.id, true)} hitSlop={8} style={{ marginTop: 6, alignSelf: "flex-start" }}>
                      <Text style={{ color: GREEN, fontSize: 11, fontWeight: "800" }}>Mark read</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
                </ScrollView>
              </View>
            ) : (
              <Text style={{ padding: 16, color: "#8A8F98" }}>No notifications yet.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function LocationPickerBody({ onPicked }: { onPicked: () => void }) {
  const { onInputFocus } = useKeyboardScroll();
  const { detectCurrent, setManual, setAllNepal, place, loading } = useBuyerLocation();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchPlaces>>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void searchPlaces(q, 12).then(setHits);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  async function choose(text: string, hit?: (typeof hits)[0]) {
    if (hit) {
      await setManual({
        label: hit.label,
        place: hit.place || hit.city || text,
        lat: hit.lat,
        lng: hit.lng,
        radiusKm: hit.place && hit.city && hit.place !== hit.city ? 6 : 14,
      });
      onPicked();
      return;
    }
    const looked = await lookupPlace(text);
    if (!looked) return;
    await setManual(looked);
    onPicked();
  }

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E6E8EC", borderRadius: 12, paddingLeft: 12, height: 48 }}>
        <Ionicons name="search" size={18} color="#9AA0A6" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={onInputFocus}
          placeholder="Kathmandu, New Baneshwor, Shantinagar, Ward 31..."
          placeholderTextColor="#9AA0A6"
          returnKeyType="search"
          onSubmitEditing={() => void choose(query)}
          style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.navy }}
        />
      </View>
      <PressScale
        onPress={async () => {
          await setAllNepal();
          onPicked();
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingVertical: 10 }}
      >
        <Ionicons name="globe-outline" size={18} color={GREEN} />
        <Text style={{ color: GREEN, fontWeight: "800" }}>All Nepal</Text>
      </PressScale>
      <PressScale
        onPress={async () => {
          setBusy(true);
          await detectCurrent();
          setBusy(false);
          onPicked();
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}
      >
        <Ionicons name="navigate" size={18} color={GREEN} />
        <Text style={{ color: GREEN, fontWeight: "800" }}>{busy || loading ? "Finding you..." : "Use my current location"}</Text>
      </PressScale>
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>Now showing: {place.label}</Text>
      {hits.map((hit) => (
        <PressScale key={`${hit.lat}-${hit.lng}-${hit.label}`} onPress={() => void choose(hit.label, hit)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
          <Text style={{ fontWeight: "700" }}>{hit.label}</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }} numberOfLines={2}>
            {hit.location}
          </Text>
        </PressScale>
      ))}
    </>
  );
}
