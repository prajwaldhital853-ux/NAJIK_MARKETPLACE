import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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

const SERVICE_TYPES = [
  "Real Estate",
  "Job Poster",
  "Vehicles",
  "Local Services",
  "Used Items",
  "Other",
] as const;

const PROFILE_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "date_of_birth", label: "Date of birth" },
  { key: "age", label: "Age" },
  { key: "father_name", label: "Father's name" },
  { key: "mother_name", label: "Mother's name" },
  { key: "grandfather_name", label: "Grandfather's name" },
  { key: "citizenship_number", label: "Citizenship number" },
  { key: "citizenship_issue_district", label: "Citizenship issue district" },
  { key: "citizenship_issue_date", label: "Citizenship issue date" },
  { key: "nation_card_number", label: "Nation card number" },
  { key: "business_name", label: "Business name" },
  { key: "service_description", label: "Service description" },
  { key: "business_start_date", label: "Business start date" },
  { key: "business_type", label: "Business type" },
  { key: "service_area_type", label: "Service area type" },
  { key: "years_experience", label: "Years of experience" },
  { key: "employee_count", label: "Employee count" },
  { key: "business_location", label: "Business location" },
  { key: "city", label: "City" },
  { key: "province", label: "Province" },
  { key: "district", label: "District" },
  { key: "area", label: "Area / tole" },
  { key: "ward_no", label: "Ward no" },
  { key: "landmark", label: "Landmark" },
  { key: "postal_code", label: "Postal code" },
  { key: "country", label: "Country" },
];

function emptyProfile(): Record<string, string> {
  return Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, ""]));
}

export function SellerProfileEditModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user, updateSellerProfile } = useAuth();
  const canEdit = isVerifiedProvider(user) || isRejectedProvider(user);
  const rejected = isRejectedProvider(user);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [address, setAddress] = useState(user?.address || "");
  const [contact, setContact] = useState("");
  const [serviceType, setServiceType] = useState(user?.service_type || "Real Estate");
  const [profileData, setProfileData] = useState<Record<string, string>>(emptyProfile());
  const [nagrita, setNagrita] = useState("");
  const [nagritaBack, setNagritaBack] = useState("");
  const [photo, setPhoto] = useState("");
  const [nationCard, setNationCard] = useState("");
  const [otherDocument, setOtherDocument] = useState("");
  const [existing, setExisting] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setFullName(user?.full_name || "");
    setAddress(user?.address || "");
    setServiceType(user?.service_type || "Real Estate");
    setNagrita("");
    setNagritaBack("");
    setPhoto("");
    setNationCard("");
    setOtherDocument("");
    setError("");
    setLoading(true);
    void fetchSellerApplication()
      .then((row) => {
        if (row.status === "none") return;
        if (typeof row.address === "string") setAddress(row.address);
        if (typeof row.contact === "string") setContact(row.contact);
        if (typeof row.full_name === "string") setFullName(row.full_name);
        if (typeof row.service_type === "string" && row.service_type) setServiceType(row.service_type);
        const pd = (row.profile_data && typeof row.profile_data === "object" ? row.profile_data : {}) as Record<string, string>;
        setProfileData({ ...emptyProfile(), ...Object.fromEntries(Object.entries(pd).map(([k, v]) => [k, String(v ?? "")])) });
        setExisting({
          photo: String(row.photo_uri || user?.photo_uri || ""),
          nagrita: String(row.nagrita_uri || ""),
          nagritaBack: String(row.nagrita_back_uri || ""),
          nationCard: String(row.nation_card_uri || ""),
          otherDocument: String(row.other_document_uri || ""),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, user?.full_name, user?.address, user?.service_type, user?.photo_uri]);

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
      const cleanedProfile = Object.fromEntries(
        Object.entries(profileData)
          .map(([k, v]) => [k, String(v || "").trim()])
          .filter(([, v]) => v),
      );
      await updateSellerProfile({
        full_name: fullName.trim(),
        address: address.trim(),
        contact: contact.trim(),
        service_type: serviceType,
        profile_data: cleanedProfile,
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

  const docPreview = useMemo(
    () => ({
      photo: photo || existing.photo,
      nagrita: nagrita || existing.nagrita,
      nagritaBack: nagritaBack || existing.nagritaBack,
      nationCard: nationCard || existing.nationCard,
      otherDocument: otherDocument || existing.otherDocument,
    }),
    [photo, nagrita, nagritaBack, nationCard, otherDocument, existing],
  );

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
          {loading ? <Text style={{ color: colors.muted, marginBottom: 12 }}>Loading your registration details…</Text> : null}
          <EditFields
            user={user}
            fullName={fullName}
            setFullName={setFullName}
            address={address}
            setAddress={setAddress}
            contact={contact}
            setContact={setContact}
            serviceType={serviceType}
            setServiceType={setServiceType}
            profileData={profileData}
            setProfileData={setProfileData}
            docPreview={docPreview}
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
  serviceType,
  setServiceType,
  profileData,
  setProfileData,
  docPreview,
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
  serviceType: string;
  setServiceType: (v: string) => void;
  profileData: Record<string, string>;
  setProfileData: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  docPreview: Record<string, string | undefined>;
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

      <SectionTitle title="Personal information" />
      <Field label="Full name *" value={fullName} onChange={setFullName} onFocus={onInputFocus} />
      <Field label="Address *" value={address} onChange={setAddress} onFocus={onInputFocus} />
      <Field label="Secondary contact" value={contact} onChange={setContact} onFocus={onInputFocus} />
      <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 8 }}>Phone and email from signup cannot be changed.</Text>
      <Locked label="Phone" value={user?.phone || "—"} />
      <Locked label="Email" value={user?.email || "—"} />

      <SectionTitle title="Service type" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {SERVICE_TYPES.map((item) => {
          const on = serviceType === item || serviceType.toLowerCase().includes(item.toLowerCase().split(" ")[0]!);
          return (
            <PressScale
              key={item}
              onPress={() => setServiceType(item)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: on ? GREEN : "#E5E7EB",
                backgroundColor: on ? "#E7F6EC" : "#fff",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 12, color: on ? GREEN : "#374151" }}>{item}</Text>
            </PressScale>
          );
        })}
      </View>

      <SectionTitle title="Registration details" />
      {PROFILE_FIELDS.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          value={profileData[field.key] || ""}
          onChange={(v) => setProfileData((prev) => ({ ...prev, [field.key]: v }))}
          onFocus={onInputFocus}
        />
      ))}

      <SectionTitle title="Documents" />
      <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 8 }}>
        Your uploaded files are shown below. Tap Replace to upload a new one.
      </Text>
      <DocCard label="Profile photo" uri={docPreview.photo} onPress={() => choosePhoto(setPhoto, "New profile photo")} />
      <DocCard label="Citizenship front (Nagrita)" uri={docPreview.nagrita} onPress={() => choosePhoto(setNagrita, "Nagrita front")} />
      <DocCard label="Citizenship back" uri={docPreview.nagritaBack} onPress={() => choosePhoto(setNagritaBack, "Nagrita back")} />
      <DocCard label="Nation card" uri={docPreview.nationCard} onPress={() => choosePhoto(setNationCard, "Nation card")} />
      <DocCard label="Other document" uri={docPreview.otherDocument} onPress={() => choosePhoto(setOtherDocument, "Other document")} />
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

function SectionTitle({ title }: { title: string }) {
  return <Text style={{ fontWeight: "800", fontSize: 14, color: colors.navy, marginTop: 8, marginBottom: 10 }}>{title}</Text>;
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
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: "700" }}>{label}</Text>
        <Text style={{ color: "#9AA0A6", fontSize: 11, marginTop: 2 }}>{uri ? "Uploaded" : "Not uploaded"}</Text>
      </View>
      <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{uri ? "Replace" : "Upload"}</Text>
    </PressScale>
  );
}
