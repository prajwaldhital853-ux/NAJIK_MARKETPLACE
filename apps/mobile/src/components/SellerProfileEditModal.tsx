import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Modal, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthImage } from "./AuthImage";
import { KeyboardScreen, useKeyboardScroll } from "./KeyboardScreen";
import { PressScale } from "./PressScale";
import { fetchSellerApplication } from "../authApi";
import { useAuth } from "../context/AuthContext";
import { isRejectedProvider, isVerifiedProvider } from "../demo";
import { choosePhoto } from "../pickPhoto";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

export function SellerProfileEditModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user, updateSellerProfile } = useAuth();
  const canEdit = isVerifiedProvider(user) || isRejectedProvider(user);
  const rejected = isRejectedProvider(user);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [address, setAddress] = useState(user?.address || "");
  const [contact, setContact] = useState("");
  const [nagrita, setNagrita] = useState("");
  const [nagritaBack, setNagritaBack] = useState("");
  const [photo, setPhoto] = useState("");
  const [nationCard, setNationCard] = useState("");
  const [otherDocument, setOtherDocument] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setFullName(user?.full_name || "");
    setAddress(user?.address || "");
    setNagrita("");
    setNagritaBack("");
    setPhoto("");
    setNationCard("");
    setOtherDocument("");
    setError("");
    void fetchSellerApplication()
      .then((row) => {
        if (typeof row.address === "string") setAddress(row.address);
        if (typeof row.contact === "string") setContact(row.contact);
        if (typeof row.full_name === "string") setFullName(row.full_name);
      })
      .catch(() => {});
  }, [visible, user?.full_name, user?.address]);

  async function save() {
    if (!canEdit) {
      Alert.alert("Wait for verification", "You can edit this profile after admin verifies your account, or if it was rejected.");
      return;
    }
    if (!fullName.trim() || !address.trim()) {
      setError("Name and address are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateSellerProfile({
        full_name: fullName.trim(),
        address: address.trim(),
        contact: contact.trim(),
        ...(nagrita ? { nagrita_uri: nagrita } : {}),
        ...(nagritaBack ? { nagrita_back_uri: nagritaBack } : {}),
        ...(photo ? { photo_uri: photo } : {}),
        ...(nationCard ? { nation_card_uri: nationCard } : {}),
        ...(otherDocument ? { other_document_uri: otherDocument } : {}),
      });
      Alert.alert(
        rejected ? "Resubmitted" : "Sent for review",
        rejected
          ? "Your updated details were sent for admin review again."
          : "Admin will verify your changes. Your live profile stays the same until then.",
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F7F8FA", paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
          <PressScale onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={22} color="#111827" />
          </PressScale>
          <Text style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: 16 }}>
            {rejected ? "Fix application" : "Edit profile"}
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <KeyboardScreen enableRefresh={false} contentStyle={{ padding: 16, paddingBottom: 28 }}>
          {rejected && user?.rejection_note ? (
            <View style={{ backgroundColor: "#FEECEC", borderRadius: 14, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontWeight: "800", color: colors.navy }}>Admin note</Text>
              <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>{user.rejection_note}</Text>
            </View>
          ) : null}
          <EditFields
            user={user}
            fullName={fullName}
            setFullName={setFullName}
            address={address}
            setAddress={setAddress}
            contact={contact}
            setContact={setContact}
            nagrita={nagrita}
            nagritaBack={nagritaBack}
            photo={photo}
            nationCard={nationCard}
            otherDocument={otherDocument}
            setNagrita={setNagrita}
            setNagritaBack={setNagritaBack}
            setPhoto={setPhoto}
            setNationCard={setNationCard}
            setOtherDocument={setOtherDocument}
            error={error}
            busy={busy}
            rejected={rejected}
            onSave={() => void save()}
          />
        </KeyboardScreen>
      </View>
    </Modal>
  );
}

function EditFields({
  user,
  fullName,
  setFullName,
  address,
  setAddress,
  contact,
  setContact,
  nagrita,
  nagritaBack,
  photo,
  nationCard,
  otherDocument,
  setNagrita,
  setNagritaBack,
  setPhoto,
  setNationCard,
  setOtherDocument,
  error,
  busy,
  rejected,
  onSave,
}: {
  user: ReturnType<typeof useAuth>["user"];
  fullName: string;
  setFullName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  contact: string;
  setContact: (v: string) => void;
  nagrita: string;
  nagritaBack: string;
  photo: string;
  nationCard: string;
  otherDocument: string;
  setNagrita: (v: string) => void;
  setNagritaBack: (v: string) => void;
  setPhoto: (v: string) => void;
  setNationCard: (v: string) => void;
  setOtherDocument: (v: string) => void;
  error: string;
  busy: boolean;
  rejected: boolean;
  onSave: () => void;
}) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <>
      {user?.has_pending_edit ? (
        <View style={{ backgroundColor: "#FFF7E6", borderRadius: 14, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontWeight: "800", color: colors.navy }}>Waiting for admin</Text>
          <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
            A previous edit is still in the queue. You can send another update if needed.
          </Text>
        </View>
      ) : null}
      <Field label="Full name" value={fullName} onChange={setFullName} onFocus={onInputFocus} />
      <Field label="Address" value={address} onChange={setAddress} onFocus={onInputFocus} />
      <Field label="Secondary contact" value={contact} onChange={setContact} onFocus={onInputFocus} />
      <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 8 }}>Phone and email from signup cannot be changed.</Text>
      <Locked label="Phone" value={user?.phone || "—"} />
      <Locked label="Email" value={user?.email || "—"} />
      <Text style={{ fontWeight: "800", marginTop: 8, marginBottom: 8 }}>Documents</Text>
      <DocCard label="Profile photo" uri={photo || user?.photo_uri} onPress={() => choosePhoto(setPhoto, "New profile photo")} />
      <DocCard label="Nagrita front" uri={nagrita} onPress={() => choosePhoto(setNagrita, "Nagrita front")} />
      <DocCard label="Nagrita back" uri={nagritaBack} onPress={() => choosePhoto(setNagritaBack, "Nagrita back")} />
      <DocCard label="Nation card" uri={nationCard} onPress={() => choosePhoto(setNationCard, "Nation card")} />
      <DocCard label="Other document" uri={otherDocument} onPress={() => choosePhoto(setOtherDocument, "Other document")} />
      {error ? <Text style={{ color: colors.red, marginTop: 10 }}>{error}</Text> : null}
      <PressScale
        onPress={onSave}
        style={{
          marginTop: 16,
          backgroundColor: GREEN,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          opacity: busy ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>
          {busy ? "Sending…" : rejected ? "Resubmit for review" : "Send for verification"}
        </Text>
      </PressScale>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        placeholder={label}
        placeholderTextColor="#9AA0A6"
        style={{ backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: "#E6E8EC" }}
      />
    </View>
  );
}

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>{label}</Text>
      <View style={{ backgroundColor: "#EEF0F3", borderRadius: 12, paddingHorizontal: 12, height: 46, justifyContent: "center" }}>
        <Text style={{ color: "#6B7280" }}>{value}</Text>
      </View>
    </View>
  );
}

function DocCard({ label, uri, onPress }: { label: string; uri?: string | null; onPress: () => void }) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        ...shadow.card,
      }}
    >
      {uri ? (
        <AuthImage uri={uri} style={{ width: 52, height: 52, borderRadius: 10 }} />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="image-outline" size={22} color={GREEN} />
        </View>
      )}
      <Text style={{ flex: 1, marginLeft: 12, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{uri ? "Replace" : "Upload"}</Text>
    </PressScale>
  );
}
