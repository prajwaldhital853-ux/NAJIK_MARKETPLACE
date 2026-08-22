import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, LayoutAnimation, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBooking } from "../bookingsApi";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { searchPlaces, type PlaceHit } from "../geo";
import { PressScale } from "./PressScale";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

export function BookingFormModal({
  visible,
  onClose,
  listingId,
  listingTitle,
  listingLocation,
  buyerId,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingLocation?: string;
  buyerId?: string;
  onSent?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refresh: refreshInbox } = useInbox();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [where, setWhere] = useState(listingLocation || "");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [item, setItem] = useState(listingTitle);
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep("form");
    setItem(listingTitle);
    setWhere(listingLocation || "");
    setName(user?.full_name || "");
    setPhone(user?.phone || "");
  }, [visible, listingTitle, listingLocation, user?.full_name, user?.phone]);

  useEffect(() => {
    const q = where.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void searchPlaces(q, 8).then(setHits);
    }, 280);
    return () => clearTimeout(t);
  }, [where]);

  function isoWhen() {
    if (!date.trim() || !time.trim()) return "";
    const value = new Date(`${date.trim()}T${time.trim()}:00`);
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString();
  }

  function goConfirm() {
    if (!isoWhen()) {
      Alert.alert("Missing time", "Add a date (YYYY-MM-DD) and time (HH:MM).");
      return;
    }
    if (!where.trim()) {
      Alert.alert("Location", "Add a Google Maps meeting place.");
      return;
    }
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {
      /* ignore */
    }
    setStep("confirm");
  }

  async function send() {
    setBusy(true);
    try {
      await createBooking({
        listing_id: listingId,
        buyer_id: buyerId,
        scheduled_at: isoWhen(),
        location: where.trim(),
        lat,
        lng,
        item: item.trim() || listingTitle,
        contact_name: name.trim(),
        contact_phone: phone.replace(/\s/g, "").slice(0, 15),
        note: note.trim(),
      });
      await refreshInbox();
      onSent?.();
      onClose();
    } catch (err) {
      Alert.alert("Could not send", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F7F8FA", paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={step === "confirm" ? () => setStep("form") : onClose} hitSlop={10}>
            <Ionicons name={step === "confirm" ? "arrow-back" : "close"} size={24} color="#111827" />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: 17 }}>
            {step === "confirm" ? "Confirm booking" : "Booking request"}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, ...shadow.card }}>
            <Text style={{ fontWeight: "800", color: GREEN, fontSize: 12, marginBottom: 8 }}>ITEM</Text>
            <Text style={{ fontWeight: "800", fontSize: 16, color: "#111827" }}>{listingTitle}</Text>
            {step === "form" ? (
              <>
                <Field label="Date" value={date} onChange={setDate} placeholder="2026-08-25" />
                <Field label="Time" value={time} onChange={setTime} placeholder="14:30" />
                <Field label="Google Maps location" value={where} onChange={setWhere} placeholder="Meeting point" />
                {hits.map((hit) => (
                  <PressScale
                    key={`${hit.lat}-${hit.lng}`}
                    onPress={() => {
                      setWhere(hit.label);
                      setLat(hit.lat);
                      setLng(hit.lng);
                      setHits([]);
                    }}
                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
                  >
                    <Text style={{ fontWeight: "700", fontSize: 13 }}>{hit.label}</Text>
                  </PressScale>
                ))}
                <Field label="What to book" value={item} onChange={setItem} placeholder="Visit / item" />
                <Field label="Your name" value={name} onChange={setName} placeholder="Name" />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="98xxxxxxxx" />
                <Field label="Note" value={note} onChange={setNote} placeholder="Optional message" multiline />
              </>
            ) : (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Row k="When" v={`${date} · ${time}`} />
                <Row k="Where" v={where} />
                <Row k="Item" v={item} />
                <Row k="Contact" v={`${name} · ${phone}`} />
                {note ? <Row k="Note" v={note} /> : null}
                <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 8 }}>Send this request to the other party?</Text>
              </View>
            )}
          </View>
          <PressScale
            onPress={step === "form" ? goConfirm : () => void send()}
            style={{
              marginTop: 16,
              backgroundColor: GREEN,
              height: 50,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>
              {busy ? "Sending…" : step === "form" ? "Review & send" : "Send booking"}
            </Text>
          </PressScale>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA0A6"
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: "#E6E8EC",
          borderRadius: 12,
          paddingHorizontal: 12,
          minHeight: multiline ? 70 : 44,
          paddingVertical: multiline ? 10 : 0,
          backgroundColor: "#FAFBFC",
        }}
      />
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View>
      <Text style={{ color: "#9AA0A6", fontSize: 11, fontWeight: "700" }}>{k}</Text>
      <Text style={{ color: "#111827", fontWeight: "700", marginTop: 2 }}>{v}</Text>
    </View>
  );
}
