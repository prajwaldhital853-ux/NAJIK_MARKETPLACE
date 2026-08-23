import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { friendlyError } from "../api";
import { AuthImage } from "../components/AuthImage";
import { PressScale } from "../components/PressScale";
import { BookingFormModal } from "../components/BookingFormModal";
import { ReportComplaintModal } from "../components/ReportComplaintModal";
import {
  blockChatThread,
  fetchAuthedDataUri,
  fetchChatThread,
  pingChatPresence,
  sendChatMessage,
  type ChatMessage,
  type ChatThread,
} from "../chatApi";
import { normTargetId } from "../inboxBridge";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { isProvider } from "../demo";
import { bookingAction } from "../bookingsApi";
import { mapsDirectionsUrl, requestUserPoint, reverseGeocode, searchPlaces, type PlaceHit } from "../geo";
import { subscribeAppRefresh } from "../listingsRefresh";
import { openBookings, openListing, openSellerPage, openSellerProfile } from "../navigation/browse";
import { choosePhoto } from "../pickPhoto";
import { colors } from "../theme";

const GREEN = colors.greenDeep;
const BG = colors.bg;
let lastKeyboardCover = 280;

function lastSeenLabel(iso?: string | null, online?: boolean) {
  if (online) return "Online";
  if (!iso) return "Offline";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "Offline";
  const m = Math.round(ms / 60000);
  if (m < 1) return "Last seen just now";
  if (m < 60) return `Last seen ${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `Last seen ${h}h ago`;
  return `Last seen ${Math.round(h / 24)}d ago`;
}

export function ChatThreadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { dismissTarget, refresh } = useInbox();
  const id = String(route.params?.id ?? "");
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [placeQ, setPlaceQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingVoice, setPendingVoice] = useState<string | null>(null);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async (incremental = false) => {
    if (!id) return;
    const since = incremental && messagesRef.current.length ? messagesRef.current[messagesRef.current.length - 1]?.created_at : undefined;
    const row = await fetchChatThread(id, since);
    setThread(row);
    const incoming = row.messages || [];
    if (!incremental || !since) {
      setMessages(incoming);
      return;
    }
    setMessages((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      const extra = incoming.filter((item) => !seen.has(item.id));
      return extra.length ? [...prev, ...extra] : prev;
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const clearChatNotices = () =>
      void dismissTarget({ target: "chat", target_id: normTargetId(id), kind: "message" }).then(() => refresh());
    clearChatNotices();
    void pingChatPresence(id).catch(() => undefined);
    void load(false).catch((err) => Alert.alert("Chat", err instanceof Error ? err.message : "Could not open chat."));
    const tick = () => {
      if (AppState.currentState !== "active") return;
      void pingChatPresence(id).catch(() => undefined);
      void load(true).catch(() => undefined);
    };
    const timer = setInterval(tick, 4000);
    const stop = subscribeAppRefresh(() => void load(false).catch(() => undefined));
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(timer);
      stop();
      sub.remove();
      clearChatNotices();
      void pingChatPresence("").catch(() => undefined);
    };
  }, [id, load, dismissTarget, refresh]);

  useEffect(() => {
    const cover = (event: { endCoordinates: { height: number; screenY: number } }) => {
      const { height, screenY } = event.endCoordinates;
      const screenH = Dimensions.get("screen").height;
      const winH = Dimensions.get("window").height;
      const next = Math.max(height || 0, screenH - screenY, winH - screenY, 0);
      if (next >= 120) {
        lastKeyboardCover = next;
        setKeyboardLift(next);
      }
    };
    const show = Keyboard.addListener("keyboardDidShow", cover);
    const willShow = Keyboard.addListener("keyboardWillShow", cover);
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardLift(0));
    const willHide = Keyboard.addListener("keyboardWillHide", () => setKeyboardLift(0));
    return () => {
      show.remove();
      willShow.remove();
      hide.remove();
      willHide.remove();
    };
  }, []);

  async function send(body: Parameters<typeof sendChatMessage>[1]) {
    try {
      const msg = await sendChatMessage(id, body);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      stickToBottom.current = true;
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      if (body.kind === "text") setDraft("");
      if (body.kind === "image") setPendingImage(null);
      if (body.kind === "voice") setPendingVoice(null);
    } catch (err) {
      Alert.alert("Chat", friendlyError(err, "Could not send."));
    }
  }

  async function callListing() {
    const number = thread?.contact_phone;
    if (!number) {
      Alert.alert("Call", "This listing has no published phone number.");
      return;
    }
    const url = `tel:${number}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Call", number);
  }

  async function shareGps() {
    const point = await requestUserPoint();
    if (!point) {
      Alert.alert("Location", "Allow location to share where you are.");
      return;
    }
    const geo = await reverseGeocode(point);
    await send({ kind: "location", lat: point.lat, lng: point.lng, location_label: geo.location || "Current location" });
    setPlaceOpen(false);
  }

  async function lookupPlace(q: string) {
    setPlaceQ(q);
    setHits(await searchPlaces(q));
  }

  async function sendComposer() {
    if (pendingVoice) {
      await send({ kind: "voice", voice: pendingVoice, text: "Voice message" });
      return;
    }
    if (pendingImage) {
      await send({ kind: "image", image: pendingImage });
      return;
    }
    if (draft.trim()) await send({ kind: "text", text: draft.trim() });
  }

  async function uriToData(uri: string, fallbackType = "audio/m4a") {
    try {
      const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });
      if (base64?.trim()) {
        return `data:${fallbackType};base64,${base64.trim()}`;
      }
    } catch {
      /* fall through to fetch */
    }
    const res = await fetch(uri);
    const blob = await res.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(blob);
    });
    if (!dataUri.startsWith("data:")) throw new Error("Could not encode audio.");
    if (dataUri.startsWith("data:;base64,") || dataUri.startsWith("data:application/octet-stream")) {
      return dataUri.replace(/^data:[^;]*;base64,/, `data:${fallbackType};base64,`);
    }
    return dataUri;
  }

  async function toggleRecord() {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        if (!uri) return;
        setPendingVoice(await uriToData(uri, "audio/m4a"));
        setPendingImage(null);
        return;
      }
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone", "Allow the microphone to send a voice message.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch {
      Alert.alert("Voice", "Could not record a voice note on this device.");
      setRecording(null);
    }
  }

  const blocked = Boolean(thread?.blocked_by_me || thread?.blocked_me);
  const canSend = Boolean(draft.trim() || pendingImage || pendingVoice);
  const [openingProfile, setOpeningProfile] = useState(false);

  function openOtherProfile() {
    if (!thread?.other.id) return;
    setOpeningProfile(true);
    openSellerProfile(navigation, thread.other.id, {
      full_name: thread.other.full_name,
      account_type: thread.other.account_type,
    });
    setTimeout(() => setOpeningProfile(false), 900);
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingBottom: keyboardLift }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ width: 32 }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Pressable onPress={openOtherProfile} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontWeight: "800", fontSize: 16, flexShrink: 1 }} numberOfLines={1}>
                {thread?.other.full_name || "Chat"}
              </Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: thread?.other.online ? "#22C55E" : "#D1D5DB" }} />
            </Pressable>
            <Text style={{ color: "#6B7280", fontSize: 11 }}>{lastSeenLabel(thread?.other.last_seen, thread?.other.online)}</Text>
          </View>
          <PressScale onPress={callListing} style={{ padding: 6 }}>
            <Ionicons name="call-outline" size={20} color={GREEN} />
          </PressScale>
          <PressScale
            onPress={() =>
              Alert.alert("Chat", "Private listing chat", [
                {
                  text: "Block",
                  style: "destructive",
                  onPress: () =>
                    void blockChatThread(id)
                      .then(setThread)
                      .catch((err) => Alert.alert("Block", err instanceof Error ? err.message : "Could not block.")),
                },
                { text: "Report", onPress: () => setReportOpen(true) },
                { text: "Cancel", style: "cancel" },
              ])
            }
            style={{ padding: 6 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#111827" />
          </PressScale>
        </View>
        {thread ? (
          <PressScale
            onPress={() => thread.listing_id && openListing(navigation, thread.listing_id)}
            style={{ flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingBottom: 12, alignItems: "center" }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
              {thread.listing_photo ? <AuthImage uri={thread.listing_photo} style={{ width: 44, height: 44 }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 13 }} numberOfLines={1}>
                {thread.listing_title}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 12 }} numberOfLines={1}>
                {[thread.listing_price, thread.listing_location].filter(Boolean).join(" · ")}
              </Text>
            </View>
            {thread.listing_sold ? (
              <View style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: "#DC2626", fontWeight: "800", fontSize: 11 }}>SOLD</Text>
              </View>
            ) : null}
          </PressScale>
        ) : null}
        {thread?.listing_sold ? (
          <View style={{ backgroundColor: "#FEE2E2", marginHorizontal: 12, marginBottom: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 }}>
            <Text style={{ color: "#DC2626", fontWeight: "800", fontSize: 12, textAlign: "center" }}>SOLD</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        scrollEventThrottle={16}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
          stickToBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
        }}
        onContentSizeChange={() => {
          if (stickToBottom.current) listRef.current?.scrollToEnd({ animated: false });
        }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: messages.length ? undefined : "center",
          paddingHorizontal: 10,
          paddingTop: 10,
          paddingBottom: 12,
        }}
        renderItem={({ item }) => (
          <Bubble
            msg={item}
            onOpenPhoto={setPhotoUri}
            userId={user?.id}
            onOpenBooking={(bookingId) => {
              void dismissTarget({ kind: "booking", target_id: bookingId });
              if (isProvider(user)) openSellerPage(navigation, "bookings", { bookingId });
              else openBookings(navigation, bookingId);
            }}
            onBookingAct={async (bookingId, action) => {
              try {
                await bookingAction(bookingId, action);
                await load(false);
              } catch (err) {
                Alert.alert("Booking", err instanceof Error ? err.message : "Could not update this booking.");
              }
            }}
          />
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: colors.muted, paddingHorizontal: 32, lineHeight: 20 }}>
            No messages yet. Say hello below.
          </Text>
        }
      />

      <View>
      {blocked ? (
        <Text style={{ textAlign: "center", color: colors.muted, padding: 12, backgroundColor: colors.white }}>
          {thread?.blocked_by_me ? "You blocked this conversation. You can still report it." : "This conversation is blocked."}
        </Text>
      ) : (
        <ComposerBar
          replies={thread?.quick_replies || []}
          draft={draft}
          setDraft={setDraft}
          recording={Boolean(recording)}
          pendingImage={pendingImage}
          pendingVoice={pendingVoice}
          safeBottom={keyboardLift > 0 ? 6 : insets.bottom}
          canSend={canSend}
          onFocusInput={() => setKeyboardLift(lastKeyboardCover)}
          onSend={() => void sendComposer()}
          onQuick={(text) => void send({ kind: "text", text })}
          onPhoto={() => choosePhoto((image) => {
            setPendingImage(image);
            setPendingVoice(null);
          })}
          onOpenPendingPhoto={() => pendingImage && setPhotoUri(pendingImage)}
          onVoice={() => void toggleRecord()}
          onPlace={() => setPlaceOpen(true)}
          onBook={() => setBookOpen(true)}
          onClearAttach={() => {
            setPendingImage(null);
            setPendingVoice(null);
          }}
        />
      )}
      </View>

      <PhotoViewer uri={photoUri} onClose={() => setPhotoUri(null)} />

      <Modal visible={placeOpen} animationType="fade" transparent onRequestClose={() => setPlaceOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }} onPress={() => setPlaceOpen(false)}>
          <Pressable style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" }} onPress={() => undefined}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>Share a meeting point</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>GPS or a typed place. Only this chat can see it.</Text>
            <PressScale onPress={() => void shareGps()} style={{ marginTop: 12, backgroundColor: GREEN, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>Share current location</Text>
            </PressScale>
            <PlaceField value={placeQ} onChange={(q) => void lookupPlace(q)} hits={hits} onPick={(hit) => void send({ kind: "location", lat: hit.lat, lng: hit.lng, location_label: hit.label }).then(() => setPlaceOpen(false))} />
          </Pressable>
        </Pressable>
      </Modal>

      {thread?.listing_id ? (
        <BookingFormModal
          visible={bookOpen}
          onClose={() => setBookOpen(false)}
          listingId={thread.listing_id}
          listingTitle={thread.listing_title}
          listingLocation={thread.listing_location}
          buyerId={thread.i_am_buyer ? undefined : thread.other.id}
          onSent={() => void load(false)}
        />
      ) : null}

      <ReportComplaintModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="chat"
        title={thread?.listing_title || "Chat"}
        threadId={id}
      />
      {openingProfile ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <ActivityIndicator color={GREEN} size="large" />
          <Text style={{ marginTop: 10, fontWeight: "700", color: "#374151" }}>Opening profile…</Text>
        </View>
      ) : null}
    </View>
  );
}

function PhotoViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={Boolean(uri)} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Pressable onPress={onClose} style={{ position: "absolute", top: 48, right: 16, zIndex: 2, padding: 8 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        {uri ? (
          uri.startsWith("http") ? (
            <AuthImage uri={uri} style={{ flex: 1, width: "100%" }} resizeMode="contain" />
          ) : (
            <Image source={{ uri }} style={{ flex: 1, width: "100%" }} resizeMode="contain" />
          )
        ) : null}
      </View>
    </Modal>
  );
}

function PlaceField({
  value,
  onChange,
  hits,
  onPick,
}: {
  value: string;
  onChange: (q: string) => void;
  hits: PlaceHit[];
  onPick: (hit: PlaceHit) => void;
}) {
  return (
    <>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Type a place in Nepal"
        style={{ marginTop: 10, borderWidth: 1, borderColor: "#E6E8EC", borderRadius: 12, padding: 10 }}
      />
      {hits.map((hit, index) => (
        <PressScale key={`${hit.lat}-${hit.lng}-${hit.label}-${index}`} onPress={() => onPick(hit)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
          <Text style={{ fontWeight: "700" }}>{hit.label}</Text>
        </PressScale>
      ))}
    </>
  );
}

function ComposerBar({
  replies,
  draft,
  setDraft,
  recording,
  pendingImage,
  pendingVoice,
  safeBottom,
  canSend,
  onSend,
  onQuick,
  onPhoto,
  onOpenPendingPhoto,
  onVoice,
  onPlace,
  onBook,
  onClearAttach,
  onFocusInput,
}: {
  replies: string[];
  draft: string;
  setDraft: (v: string) => void;
  recording: boolean;
  pendingImage: string | null;
  pendingVoice: string | null;
  safeBottom: number;
  canSend: boolean;
  onSend: () => void;
  onQuick: (text: string) => void;
  onPhoto: () => void;
  onOpenPendingPhoto: () => void;
  onVoice: () => void;
  onPlace: () => void;
  onBook: () => void;
  onClearAttach: () => void;
  onFocusInput: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(safeBottom, 8),
        paddingTop: 8,
        paddingHorizontal: 8,
      }}
    >
      {replies.length && !pendingImage && !pendingVoice && !recording ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
          {replies.map((item, index) => (
            <PressScale key={`${item}-${index}`} onPress={() => onQuick(item)} style={{ backgroundColor: colors.greenSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: GREEN, fontWeight: "700", fontSize: 12 }}>{item}</Text>
            </PressScale>
          ))}
        </ScrollView>
      ) : null}
      {pendingImage ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, backgroundColor: colors.greenPale, borderRadius: 14, padding: 8 }}>
          <PressScale onPress={onOpenPendingPhoto}>
            <Image source={{ uri: pendingImage }} style={{ width: 64, height: 64, borderRadius: 10 }} />
          </PressScale>
          <Text style={{ flex: 1, fontWeight: "700", color: colors.navy }}>Tap photo to view full size, then send.</Text>
          <PressScale onPress={onClearAttach} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={22} color={colors.muted} />
          </PressScale>
        </View>
      ) : null}
      {pendingVoice ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 8, paddingHorizontal: 10 }}>
          <VoiceWave uri={pendingVoice} mine={false} seed="draft" />
          <PressScale onPress={onClearAttach} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={22} color="#9AA0A6" />
          </PressScale>
        </View>
      ) : null}
      {recording ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#E53935" }} />
          <LiveBars />
          <Text style={{ color: "#E53935", fontWeight: "800", fontSize: 12 }}>Recording · tap stop</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <PressScale onPress={onPhoto} style={{ padding: 8 }}>
          <Ionicons name="image-outline" size={22} color={GREEN} />
        </PressScale>
        <PressScale onPress={onPlace} style={{ padding: 8 }}>
          <Ionicons name="location-outline" size={22} color={GREEN} />
        </PressScale>
        <PressScale onPress={onBook} style={{ padding: 8 }}>
          <Ionicons name="calendar-outline" size={22} color={GREEN} />
        </PressScale>
        <PressScale onPress={onVoice} style={{ padding: 8 }}>
          <Ionicons name={recording ? "stop-circle" : "mic-outline"} size={22} color={recording ? "#E53935" : GREEN} />
        </PressScale>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={pendingImage ? "Add a caption" : pendingVoice ? "Add a caption" : "Message"}
          editable={!recording}
          onFocus={onFocusInput}
          style={{ flex: 1, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: "#E6E8EC", borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff" }}
          multiline
        />
        <PressScale
          onPress={onSend}
          disabled={!canSend}
          style={{ backgroundColor: canSend ? GREEN : "#C5E6CC", width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </PressScale>
      </View>
    </View>
  );
}

function barsFromSeed(seed: string, count = 24) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: count }, (_, i) => {
    h = Math.imul(h ^ (i + 1), 16777619);
    return 5 + (Math.abs(h) % 16);
  });
}

function WaveBars({ seed, color, live }: { seed: string; color: string; live?: number[] }) {
  const bars = live || barsFromSeed(seed);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 1.5, height: 22, flex: 1 }}>
      {bars.map((h, i) => (
        <View key={i} style={{ width: 2.5, height: h, borderRadius: 2, backgroundColor: color, opacity: 0.35 + (h / 22) * 0.65 }} />
      ))}
    </View>
  );
}

function LiveBars() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 120);
    return () => clearInterval(id);
  }, []);
  const bars = barsFromSeed(`live-${tick}`, 28);
  return <WaveBars seed="live" color="#E53935" live={bars} />;
}

function VoiceWave({ uri, mine, seed }: { uri: string | null; mine: boolean; seed: string }) {
  const [playing, setPlaying] = useState(false);
  async function play() {
    if (!uri) return;
    try {
      const src = uri.startsWith("http") ? await fetchAuthedDataUri(uri) : uri;
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: src });
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) {
          setPlaying(false);
          void sound.unloadAsync();
        }
      });
      await sound.playAsync();
    } catch {
      Alert.alert("Voice", "Could not play this voice note.");
    }
  }
  const color = mine ? "#fff" : GREEN;
  return (
    <PressScale onPress={() => void play()} style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 160 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: mine ? "rgba(255,255,255,0.22)" : "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={playing ? "pause" : "play"} size={14} color={color} />
      </View>
      <WaveBars seed={seed} color={color} />
    </PressScale>
  );
}

function Bubble({
  msg,
  onOpenPhoto,
  userId,
  onOpenBooking,
  onBookingAct,
}: {
  msg: ChatMessage;
  onOpenPhoto: (uri: string) => void;
  userId?: string;
  onOpenBooking: (bookingId: string) => void;
  onBookingAct: (bookingId: string, action: "accept" | "reject" | "cancel") => Promise<void>;
}) {
  const mine = msg.mine;
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "86%", marginVertical: 1 }}>
      <View
        style={{
          backgroundColor: mine ? GREEN : colors.white,
          borderRadius: 16,
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        {msg.kind === "image" && msg.image_url ? (
          <Pressable onPress={() => onOpenPhoto(msg.image_url!)}>
            <AuthImage uri={msg.image_url} style={{ width: 196, height: 140, borderRadius: 10, marginBottom: 4 }} />
          </Pressable>
        ) : null}
        {msg.kind === "voice" ? <VoiceWave uri={msg.voice_url} mine={mine} seed={msg.id} /> : null}
        {msg.kind === "location" && msg.lat != null && msg.lng != null ? (
          <PressScale
            onPress={() => void Linking.openURL(mapsDirectionsUrl({ lat: msg.lat!, lng: msg.lng! }))}
            style={{ paddingVertical: 2 }}
          >
            <Text style={{ color: mine ? "#fff" : GREEN, fontWeight: "800", fontSize: 13 }}>{msg.location_label || "Meeting point"}</Text>
            <Text style={{ color: mine ? "#D1FAE5" : "#6B7280", fontSize: 11 }}>Open map</Text>
          </PressScale>
        ) : null}
        {msg.kind === "booking" ? (
          <BookingBubble text={msg.text} mine={mine} userId={userId} onOpen={onOpenBooking} onAct={onBookingAct} />
        ) : null}
        {msg.text && msg.kind === "text" ? (
          <Text style={{ color: mine ? "#fff" : "#111827", fontSize: 15, lineHeight: 20 }}>{msg.text}</Text>
        ) : null}
      </View>
    </View>
  );
}

type BookingPayload = {
  id?: string;
  status?: string;
  item?: string;
  when?: string;
  where?: string;
  note?: string;
  contact_name?: string;
  contact_phone?: string;
  requester_id?: string;
  recipient_id?: string;
};

function BookingBubble({
  text,
  mine,
  userId,
  onOpen,
  onAct,
}: {
  text: string;
  mine: boolean;
  userId?: string;
  onOpen: (bookingId: string) => void;
  onAct: (bookingId: string, action: "accept" | "reject" | "cancel") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  let data: BookingPayload = {};
  try {
    data = JSON.parse(text || "{}");
  } catch {
    data = {};
  }
  const pending = (data.status || "pending") === "pending";
  const accepted = data.status === "accepted";
  const isRecipient = Boolean(userId && data.recipient_id && userId === data.recipient_id);
  const isRequester = Boolean(userId && data.requester_id && userId === data.requester_id);
  const canAccept = pending && isRecipient;
  const canCancel = (pending && isRequester) || (accepted && (isRequester || isRecipient));
  const muted = mine ? "#D1FAE5" : "#6B7280";
  const fg = mine ? "#fff" : "#111827";

  async function act(action: "accept" | "reject" | "cancel") {
    if (!data.id || busy) return;
    setBusy(true);
    try {
      await onAct(data.id, action);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable onPress={() => data.id && onOpen(data.id)} style={{ minWidth: 210 }}>
      <Text style={{ color: mine ? "#fff" : GREEN, fontWeight: "800", fontSize: 12 }}>BOOKING</Text>
      <Text style={{ color: fg, fontWeight: "800", marginTop: 4 }}>{data.item || "Visit"}</Text>
      {data.when ? (
        <Text style={{ color: muted, fontSize: 11, marginTop: 4 }}>{new Date(data.when).toLocaleString()}</Text>
      ) : null}
      {data.where ? <Text style={{ color: muted, fontSize: 11, marginTop: 2 }}>{data.where}</Text> : null}
      {data.contact_name ? <Text style={{ color: muted, fontSize: 11, marginTop: 2 }}>Name: {data.contact_name}</Text> : null}
      {data.contact_phone ? <Text style={{ color: muted, fontSize: 11 }}>Phone: {data.contact_phone}</Text> : null}
      {data.note ? <Text style={{ color: muted, fontSize: 11, marginTop: 2 }}>{data.note}</Text> : null}
      <Text style={{ color: mine ? "#fff" : "#146B32", fontWeight: "800", fontSize: 11, marginTop: 6, textTransform: "capitalize" }}>
        {data.status || "pending"}
      </Text>
      <Text style={{ color: muted, fontSize: 10, marginTop: 4 }}>Tap to open booking page</Text>
      {canAccept || canCancel ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {canAccept ? (
            <>
              <MiniChatBtn label={busy ? "…" : "Accept"} fill mine={mine} onPress={() => void act("accept")} />
              <MiniChatBtn label="Reject" danger mine={mine} onPress={() => void act("reject")} />
            </>
          ) : null}
          {canCancel ? <MiniChatBtn label="Cancel" danger mine={mine} onPress={() => void act("cancel")} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function MiniChatBtn({
  label,
  onPress,
  fill,
  danger,
  mine,
}: {
  label: string;
  onPress: () => void;
  fill?: boolean;
  danger?: boolean;
  mine?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: fill ? (mine ? "#fff" : GREEN) : "transparent",
        borderWidth: 1,
        borderColor: danger ? "#FECACA" : mine ? "#fff" : GREEN,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 11, color: fill ? (mine ? GREEN : "#fff") : danger ? "#B91C1C" : mine ? "#fff" : "#111827" }}>{label}</Text>
    </PressScale>
  );
}
