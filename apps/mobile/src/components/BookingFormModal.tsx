import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, LayoutAnimation, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBooking } from "../bookingsApi";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { requestUserPoint, reverseGeocode, searchPlaces, type PlaceHit } from "../geo";
import { FormToast } from "./FormToast";
import { PressScale } from "./PressScale";
import { DatePickerModal } from "./DatePickerModal";
import { TimePickerModal } from "./TimePickerModal";
import { shadow } from "../theme";

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [where, setWhere] = useState(listingLocation || "");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [locMode, setLocMode] = useState<"current" | "manual">("manual");
  const [locBusy, setLocBusy] = useState(false);
  const [item, setItem] = useState(listingTitle);
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, ok = false) {
    setToastOk(ok);
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setStep("form");
    setItem(listingTitle);
    setWhere(listingLocation || "");
    setLat(null);
    setLng(null);
    setHits([]);
    setLocMode("manual");
    setName(user?.full_name || "");
    setPhone(user?.phone || "");
    setToast("");
  }, [visible, listingTitle, listingLocation, user?.full_name, user?.phone]);

  useEffect(() => {
    if (locMode !== "manual") {
      setHits([]);
      return;
    }
    const q = where.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void searchPlaces(q, 8).then(setHits);
    }, 280);
    return () => clearTimeout(t);
  }, [where, locMode]);

  function isoWhen() {
    return selectedDate.toISOString();
  }

  function formatDate(date: Date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatTime(date: Date) {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${period}`;
  }

  async function useCurrentLocation() {
    setLocBusy(true);
    try {
      const point = await requestUserPoint();
      if (!point) {
        showToast("Allow location to use where you are, or type a place below.");
        return;
      }
      const geo = await reverseGeocode(point);
      setWhere(geo.location || "Current location");
      setLat(point.lat);
      setLng(point.lng);
      setHits([]);
      setLocMode("current");
    } catch {
      showToast("Could not find your location. Type a place instead.");
    } finally {
      setLocBusy(false);
    }
  }

  function goConfirm() {
    if (!where.trim()) {
      showToast("Add a meeting place or use your current location.");
      return;
    }
    if (!name.trim()) {
      showToast("Please enter your name.");
      return;
    }
    if (!phone.trim()) {
      showToast("Please enter your phone number.");
      return;
    }
    Keyboard.dismiss();
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
      showToast("Booking sent. The other person will see it in chat.", true);
      onSent?.();
      setTimeout(() => onClose(), 900);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not send this booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Pressable onPress={step === "confirm" ? () => setStep("form") : onClose} hitSlop={10}>
            <Ionicons name={step === "confirm" ? "arrow-back" : "close"} size={26} color="#111827" />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: 18, color: "#111827" }}>
            {step === "confirm" ? "Confirm Booking" : "Book a Visit"}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }}
          style={{ flex: 1 }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, ...shadow.card, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "#F0FDF4",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="document-text" size={22} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", fontSize: 11, color: GREEN, letterSpacing: 0.5 }}>BOOKING FOR</Text>
                <Text style={{ fontWeight: "800", fontSize: 16, color: "#111827", marginTop: 2 }}>{listingTitle}</Text>
              </View>
            </View>
          </View>

          {step === "form" ? (
            <>
              <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, ...shadow.card, marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <Ionicons name="calendar" size={20} color={GREEN} />
                  <Text style={{ fontWeight: "800", fontSize: 15, color: "#111827", marginLeft: 8 }}>Date & Time</Text>
                </View>
                <PressScale
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor: "#F9FAFB",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700", marginBottom: 4 }}>SELECT DATE</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "700", fontSize: 16, color: "#111827" }}>{formatDate(selectedDate)}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </PressScale>
                <PressScale
                  onPress={() => setShowTimePicker(true)}
                  style={{
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor: "#F9FAFB",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700", marginBottom: 4 }}>SELECT TIME</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "700", fontSize: 16, color: "#111827" }}>{formatTime(selectedDate)}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </PressScale>
              </View>

              <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, ...shadow.card, marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <Ionicons name="location" size={20} color={GREEN} />
                  <Text style={{ fontWeight: "800", fontSize: 15, color: "#111827", marginLeft: 8 }}>Meeting Location</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                  <PressScale
                    onPress={() => void useCurrentLocation()}
                    style={{
                      flex: 1,
                      borderWidth: 1.5,
                      borderColor: locMode === "current" ? GREEN : "#E5E7EB",
                      backgroundColor: locMode === "current" ? "#F0FDF4" : "#F9FAFB",
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {locBusy ? <ActivityIndicator size="small" color={GREEN} /> : <Ionicons name="navigate" size={20} color={GREEN} />}
                    <Text style={{ fontWeight: "800", fontSize: 12, color: "#111827", textAlign: "center" }}>
                      {locBusy ? "Finding…" : "Current"}
                    </Text>
                  </PressScale>
                  <PressScale
                    onPress={() => {
                      setLocMode("manual");
                      setHits([]);
                    }}
                    style={{
                      flex: 1,
                      borderWidth: 1.5,
                      borderColor: locMode === "manual" ? GREEN : "#E5E7EB",
                      backgroundColor: locMode === "manual" ? "#F0FDF4" : "#F9FAFB",
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color={GREEN} />
                    <Text style={{ fontWeight: "800", fontSize: 12, color: "#111827", textAlign: "center" }}>Manual</Text>
                  </PressScale>
                </View>
                <TextInput
                  value={where}
                  onChangeText={(value) => {
                    setWhere(value);
                    setLocMode("manual");
                  }}
                  placeholder="Type a place in Nepal"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    minHeight: 50,
                    backgroundColor: "#F9FAFB",
                    fontSize: 15,
                    color: "#111827",
                  }}
                />
                {hits.length > 0 ? (
                  <View
                    style={{
                      marginTop: 8,
                      borderRadius: 14,
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      overflow: "hidden",
                    }}
                  >
                    {hits.map((hit, index) => (
                      <PressScale
                        key={`${hit.lat}-${hit.lng}-${hit.label}-${index}`}
                        onPress={() => {
                          setWhere(hit.label);
                          setLat(hit.lat);
                          setLng(hit.lng);
                          setHits([]);
                          setLocMode("manual");
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderBottomWidth: index < hits.length - 1 ? 1 : 0,
                          borderBottomColor: "#F3F4F6",
                        }}
                      >
                        <Text style={{ fontWeight: "700", fontSize: 14, color: "#111827" }}>{hit.label}</Text>
                        {hit.location ? (
                          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }} numberOfLines={2}>
                            {hit.location}
                          </Text>
                        ) : null}
                      </PressScale>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, ...shadow.card, marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <Ionicons name="person" size={20} color={GREEN} />
                  <Text style={{ fontWeight: "800", fontSize: 15, color: "#111827", marginLeft: 8 }}>Contact Details</Text>
                </View>
                <Field label="Your name" value={name} onChange={setName} placeholder="Full name" />
                <Field label="Phone number" value={phone} onChange={setPhone} placeholder="98xxxxxxxx" />
              </View>

              <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, ...shadow.card, marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <Ionicons name="chatbubbles" size={20} color={GREEN} />
                  <Text style={{ fontWeight: "800", fontSize: 15, color: "#111827", marginLeft: 8 }}>Additional Info</Text>
                </View>
                <Field label="What to book (optional)" value={item} onChange={setItem} placeholder="e.g., Visit, Consultation" />
                <Field label="Note (optional)" value={note} onChange={setNote} placeholder="Any special requests?" multiline />
              </View>
            </>
            ) : (
              <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, ...shadow.card }}>
                <View
                  style={{
                    backgroundColor: "#F0FDF4",
                    borderRadius: 14,
                    padding: 14,
                    borderLeftWidth: 4,
                    borderLeftColor: GREEN,
                    marginBottom: 18,
                  }}
                >
                  <Text style={{ fontWeight: "800", fontSize: 13, color: GREEN, marginBottom: 6 }}>REVIEW YOUR BOOKING</Text>
                  <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18 }}>
                    Please review the details below. Once confirmed, the seller will receive your booking request.
                  </Text>
                </View>
                <ConfirmRow icon="calendar-outline" label="Date & Time" value={`${formatDate(selectedDate)} at ${formatTime(selectedDate)}`} />
                <ConfirmRow icon="location-outline" label="Meeting Place" value={where} />
                <ConfirmRow icon="person-outline" label="Contact Name" value={name} />
                <ConfirmRow icon="call-outline" label="Phone" value={phone} />
                {item.trim() && item !== listingTitle ? <ConfirmRow icon="pricetag-outline" label="Item" value={item} /> : null}
                {note.trim() ? <ConfirmRow icon="chatbubble-outline" label="Note" value={note} /> : null}
              </View>
            )}

          <PressScale
            onPress={step === "form" ? goConfirm : () => void send()}
            style={{
              backgroundColor: GREEN,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.7 : 1,
              ...shadow.card,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              {busy ? "Sending…" : step === "form" ? "Review Booking" : "Confirm & Send"}
            </Text>
          </PressScale>
        </ScrollView>
        {toast ? <FormToast message={toast} variant={toastOk ? "success" : "error"} /> : null}
        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelect={(date) => {
            setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), selectedDate.getHours(), selectedDate.getMinutes()));
          }}
          initialDate={selectedDate}
        />
        <TimePickerModal
          visible={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          onSelect={(hour, minute) => {
            setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute));
          }}
          initialHour={selectedDate.getHours()}
          initialMinute={selectedDate.getMinutes()}
        />
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
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 8 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        style={{
          borderWidth: 1.5,
          borderColor: "#E5E7EB",
          borderRadius: 14,
          paddingHorizontal: 16,
          minHeight: multiline ? 80 : 50,
          paddingVertical: multiline ? 12 : 0,
          backgroundColor: "#F9FAFB",
          fontSize: 15,
          color: "#111827",
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function ConfirmRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: "#F0FDF4",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#9CA3AF", fontSize: 12, fontWeight: "700", marginBottom: 3 }}>{label}</Text>
        <Text style={{ color: "#111827", fontWeight: "700", fontSize: 15, lineHeight: 20 }}>{value}</Text>
      </View>
    </View>
  );
}
