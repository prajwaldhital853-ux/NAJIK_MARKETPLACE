import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthImage } from "../components/AuthImage";
import { PressScale } from "../components/PressScale";
import {
  blockChatThread,
  fetchAuthedDataUri,
  fetchChatThread,
  reportChatThread,
  sendChatMessage,
  type ChatMessage,
  type ChatThread,
} from "../chatApi";
import { mapsDirectionsUrl, requestUserPoint, reverseGeocode, searchPlaces, type PlaceHit } from "../geo";
import { subscribeAppRefresh } from "../listingsRefresh";
import { openListing } from "../navigation/browse";
import { choosePhoto } from "../pickPhoto";

const GREEN = "#1B7D2C";

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
  const id = String(route.params?.id ?? "");
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [placeQ, setPlaceQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingVoice, setPendingVoice] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const listRef = useRef<FlatList<ChatMessage>>(null);

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
    void load(false).catch((err) => Alert.alert("Chat", err instanceof Error ? err.message : "Could not open chat."));
    const tick = () => {
      if (AppState.currentState !== "active") return;
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
    };
  }, [id, load]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  async function send(body: Parameters<typeof sendChatMessage>[1]) {
    try {
      const msg = await sendChatMessage(id, body);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (body.kind === "text") setDraft("");
      if (body.kind === "image") setPendingImage(null);
      if (body.kind === "voice") setPendingVoice(null);
    } catch (err) {
      Alert.alert("Chat", err instanceof Error ? err.message : "Could not send.");
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
    const res = await fetch(uri);
    const blob = await res.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(blob);
    });
    return dataUri.replace("data:application/octet-stream", `data:${fallbackType}`);
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
  const threadData = useMemo(() => [...messages].reverse(), [messages]);
  const canSend = Boolean(draft.trim() || pendingImage || pendingVoice);

  return (
    <View style={{ flex: 1, backgroundColor: "#ECE5DD", paddingBottom: keyboardHeight }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ width: 32 }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
                {thread?.other.full_name || "Chat"}
              </Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: thread?.other.online ? "#22C55E" : "#D1D5DB" }} />
            </View>
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
          </PressScale>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        inverted
        data={threadData}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 6 }}
        renderItem={({ item }) => <Bubble msg={item} />}
        ListEmptyComponent={
          <View style={{ padding: 24, transform: [{ scaleY: -1 }] }}>
            <Text style={{ textAlign: "center", color: "#6B7280" }}>No messages yet. Say hello below.</Text>
          </View>
        }
      />

      {blocked ? (
        <Text style={{ textAlign: "center", color: "#6B7280", padding: 12, backgroundColor: "#fff" }}>
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
          keyboardPad={0}
          safeBottom={keyboardHeight > 0 ? 8 : insets.bottom}
          canSend={canSend}
          onSend={() => void sendComposer()}
          onQuick={(text) => void send({ kind: "text", text })}
          onPhoto={() => choosePhoto((image) => {
            setPendingImage(image);
            setPendingVoice(null);
          })}
          onVoice={() => void toggleRecord()}
          onPlace={() => setPlaceOpen(true)}
          onClearAttach={() => {
            setPendingImage(null);
            setPendingVoice(null);
          }}
        />
      )}

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

      <Modal visible={reportOpen} animationType="fade" transparent onRequestClose={() => setReportOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 20 }} onPress={() => setReportOpen(false)}>
          <Pressable style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16 }} onPress={() => undefined}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>Report this chat</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 6 }}>
              The full conversation and both account details go to NAJIK admin for review. Admin can take action on either account.
            </Text>
            <ReportField value={reportReason} onChange={setReportReason} />
            <PressScale
              onPress={() => {
                void reportChatThread(id, reportReason.trim())
                  .then(() => {
                    setReportOpen(false);
                    setReportReason("");
                    Alert.alert("Reported", "Admin will review this chat.");
                  })
                  .catch((err) => Alert.alert("Report", err instanceof Error ? err.message : "Could not report."));
              }}
              style={{ marginTop: 12, backgroundColor: "#E53935", borderRadius: 12, padding: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Send report</Text>
            </PressScale>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ReportField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="What went wrong?"
      multiline
      style={{ marginTop: 12, minHeight: 90, borderWidth: 1, borderColor: "#E6E8EC", borderRadius: 12, padding: 10, textAlignVertical: "top" }}
    />
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
      {hits.map((hit) => (
        <PressScale key={`${hit.lat}-${hit.lng}`} onPress={() => onPick(hit)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
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
  keyboardPad,
  safeBottom,
  canSend,
  onSend,
  onQuick,
  onPhoto,
  onVoice,
  onPlace,
  onClearAttach,
}: {
  replies: string[];
  draft: string;
  setDraft: (v: string) => void;
  recording: boolean;
  pendingImage: string | null;
  pendingVoice: string | null;
  keyboardPad: number;
  safeBottom: number;
  canSend: boolean;
  onSend: () => void;
  onQuick: (text: string) => void;
  onPhoto: () => void;
  onVoice: () => void;
  onPlace: () => void;
  onClearAttach: () => void;
}) {
  const bottomPad = keyboardPad > 0 ? 8 : Math.max(safeBottom, 8);
  return (
    <View
      style={{
        backgroundColor: "#F0F2F5",
        borderTopWidth: 1,
        borderTopColor: "#E6E8EC",
        paddingBottom: bottomPad,
        paddingTop: 8,
        paddingHorizontal: 8,
      }}
    >
      {replies.length && !pendingImage && !pendingVoice && !recording ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {replies.map((item) => (
            <PressScale key={item} onPress={() => onQuick(item)} style={{ backgroundColor: "#E7F6EC", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: GREEN, fontWeight: "700", fontSize: 12 }}>{item}</Text>
            </PressScale>
          ))}
        </View>
      ) : null}
      {pendingImage ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, backgroundColor: "#fff", borderRadius: 14, padding: 8 }}>
          <Image source={{ uri: pendingImage }} style={{ width: 56, height: 56, borderRadius: 10 }} />
          <Text style={{ flex: 1, fontWeight: "700", color: "#111827" }}>Photo ready. Tap send.</Text>
          <PressScale onPress={onClearAttach} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={22} color="#9AA0A6" />
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
        <PressScale onPress={onVoice} style={{ padding: 8 }}>
          <Ionicons name={recording ? "stop-circle" : "mic-outline"} size={22} color={recording ? "#E53935" : GREEN} />
        </PressScale>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={pendingImage ? "Add a caption" : pendingVoice ? "Add a caption" : "Message"}
          editable={!recording}
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

function Bubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.mine;
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%", marginVertical: 1 }}>
      <View
        style={{
          backgroundColor: mine ? GREEN : "#fff",
          borderRadius: 16,
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        {msg.kind === "image" && msg.image_url ? <AuthImage uri={msg.image_url} style={{ width: 196, height: 140, borderRadius: 10, marginBottom: 4 }} /> : null}
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
        {msg.text && msg.kind === "text" ? (
          <Text style={{ color: mine ? "#fff" : "#111827", fontSize: 15, lineHeight: 20 }}>{msg.text}</Text>
        ) : null}
      </View>
    </View>
  );
}
