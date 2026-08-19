import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Dimensions, Image, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikLogo } from "../components/NajikLogo";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";
import type { ProviderServiceType } from "../types";

const GREEN = "#1B7D2C";
const SERVICE_CARD_W = (Dimensions.get("window").width - 32 - 10) / 2;

const steps = [
  { key: "Personal", icon: "person-outline" as const, title: "Personal info" },
  { key: "Contact", icon: "call-outline" as const, title: "Contact details" },
  { key: "Documents", icon: "document-attach-outline" as const, title: "Documents" },
];

const services: { key: ProviderServiceType; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { key: "Real Estate", icon: "home-outline", hint: "Property & land" },
  { key: "Job Poster", icon: "briefcase-outline", hint: "Hiring & jobs" },
  { key: "Vehicles", icon: "car-outline", hint: "Cars & bikes" },
  { key: "Local Services", icon: "construct-outline", hint: "Home & local work" },
  { key: "Used Items", icon: "cart-outline", hint: "Marketplace products" },
  { key: "Other", icon: "apps-outline", hint: "Something else" },
];

export function SellerApplyScreen() {
  return <SellerApplyForm />;
}

function SellerApplyForm() {
  const insets = useSafeAreaInsets();
  const { user, submitApplication, logout } = useAuth();
  const { onInputFocus } = useKeyboardScroll();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [address, setAddress] = useState(user?.address || "");
  const [contact, setContact] = useState(user?.contact || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [serviceType, setServiceType] = useState<ProviderServiceType>("Real Estate");
  const [nagrita, setNagrita] = useState("");
  const [nagritaBack, setNagritaBack] = useState("");
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function pick(kind: "nagrita" | "nagrita_back" | "photo", fromCamera?: boolean) {
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow camera to take a photo.");
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photos so you can upload nagrita and your photo.");
        return;
      }
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.4, base64: true });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) {
      if (!result.canceled) Alert.alert("Upload failed", "Could not read that image. Try another photo.");
      return;
    }
    const mime = asset.mimeType?.includes("png") ? "image/png" : "image/jpeg";
    const uri = `data:${mime};base64,${asset.base64}`;
    if (kind === "nagrita") setNagrita(uri);
    else if (kind === "nagrita_back") setNagritaBack(uri);
    else setPhoto(uri);
  }

  function chooseUpload(kind: "nagrita" | "nagrita_back" | "photo") {
    const title =
      kind === "photo" ? "Upload your photo" : kind === "nagrita_back" ? "Upload nagrita back" : "Upload nagrita front";
    Alert.alert(title, "Choose a source", [
      { text: "Camera", onPress: () => void pick(kind, true) },
      { text: "Gallery", onPress: () => void pick(kind, false) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function validateStep() {
    if (step === 0) {
      if (!fullName.trim() || !address.trim()) return "Enter your full name and address.";
    }
    if (step === 1) {
      if (!phone.trim() || !email.trim()) return "Enter phone and email.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
      if (phone.replace(/\D/g, "").length < 10) return "Enter a valid 10-digit phone number.";
    }
    if (step === 2) {
      if (!nagrita || !nagritaBack || !photo) return "Upload nagrita front, nagrita back, and your photo.";
    }
    return "";
  }

  function next() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((value) => Math.min(value + 1, 2));
  }

  function back() {
    setError("");
    if (step === 0) {
      void logout();
      return;
    }
    setStep((value) => value - 1);
  }

  async function submit() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setSubmitting(true);
    try {
      await submitApplication({
        full_name: fullName.trim(),
        address: address.trim(),
        contact: contact.trim() || phone.replace(/\s/g, ""),
        phone: phone.replace(/\s/g, ""),
        email: email.trim(),
        service_type: serviceType,
        nagrita_uri: nagrita,
        nagrita_back_uri: nagritaBack,
        photo_uri: photo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <KeyboardScreen enableRefresh={false} style={{ backgroundColor: colors.white }} contentStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
      <PressScale onPress={back} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Ionicons name="arrow-back" size={22} color={colors.navy} />
        <Text style={{ fontWeight: "700" }}>Back</Text>
      </PressScale>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <NajikLogo size="sm" showTagline={false} layout="row" />
        <View style={{ backgroundColor: "#E4F6EA", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: "#BFE6C9" }}>
          <Text style={{ color: "#146B32", fontSize: 10, fontWeight: "800" }}>Service Pro</Text>
        </View>
      </View>

      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.navy, marginTop: 14 }}>Become a Service Provider</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>Complete 3 steps. Admin verifies you before you can post.</Text>

      <View style={{ marginTop: 18, marginBottom: 8 }}>
        <View style={{ position: "absolute", left: 28, right: 28, top: 17, height: 2, backgroundColor: colors.border }} />
        <View style={{ position: "absolute", left: 28, width: step === 0 ? "0%" : step === 1 ? "42%" : "84%", top: 17, height: 2, backgroundColor: GREEN }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {steps.map((item, index) => {
            const done = index < step;
            const on = index === step;
            return (
              <PressScale key={item.key} onPress={() => index < step && setStep(index)} style={{ alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: on || done ? GREEN : colors.white,
                    borderWidth: 1.5,
                    borderColor: on || done ? GREEN : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={done ? "checkmark" : item.icon} size={16} color={on || done ? "#fff" : colors.muted} />
                </View>
                <Text style={{ fontSize: 11, marginTop: 6, fontWeight: on ? "800" : "600", color: on ? GREEN : done ? colors.navy : colors.muted }}>
                  {item.key}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      {step === 0 ? (
        <PersonalStep
          fullName={fullName}
          setFullName={setFullName}
          address={address}
          setAddress={setAddress}
          serviceType={serviceType}
          setServiceType={setServiceType}
          onFocus={onInputFocus}
        />
      ) : null}
      {step === 1 ? (
        <ContactStep
          contact={contact}
          setContact={setContact}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          onFocus={onInputFocus}
        />
      ) : null}
      {step === 2 ? (
        <DocumentStep
          nagrita={nagrita}
          nagritaBack={nagritaBack}
          photo={photo}
          fullName={fullName}
          phone={phone}
          email={email}
          serviceType={serviceType}
          onPick={chooseUpload}
        />
      ) : null}

      {error ? (
        <View style={{ marginTop: 12, backgroundColor: colors.redSoft, borderRadius: 12, padding: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Ionicons name="alert-circle" size={18} color={colors.red} />
          <Text style={{ color: colors.red, flex: 1, fontWeight: "600" }}>{error}</Text>
        </View>
      ) : null}
      </KeyboardScreen>

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <PressScale
          onPress={back}
          style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name={step === 0 ? "close" : "chevron-back"} size={14} color={colors.text} />
          <Text style={{ fontWeight: "700" }}>{step === 0 ? "Cancel" : "Back"}</Text>
        </PressScale>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: GREEN, fontSize: 12, fontWeight: "800" }}>Step {step + 1} of 3</Text>
          <Text style={{ color: colors.muted, fontSize: 10 }}>{steps[step].title}</Text>
        </View>
        <PressScale
          onPress={() => {
            if (submitting) return;
            if (step < 2) next();
            else void submit();
          }}
          style={{
            backgroundColor: GREEN,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            {step === 0 ? "Next: Contact" : step === 1 ? "Next: Documents" : submitting ? "Submitting…" : "Submit"}
          </Text>
          <Ionicons name={step === 2 ? "checkmark" : "arrow-forward"} size={14} color="#fff" />
        </PressScale>
      </View>
    </View>
  );
}

function PersonalStep({
  fullName,
  setFullName,
  address,
  setAddress,
  serviceType,
  setServiceType,
  onFocus,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  serviceType: ProviderServiceType;
  setServiceType: (v: ProviderServiceType) => void;
  onFocus: () => void;
}) {
  return (
    <View>
      <Tip text="Use the name on your nagrita so admin can verify you faster." />
      <Field label="Full name" hint="As written on your citizenship" icon="person-outline" value={fullName} onChangeText={setFullName} onFocus={onFocus} placeholder="Full name" />
      <Field label="Address" hint="Ward, city and district" icon="location-outline" value={address} onChangeText={setAddress} onFocus={onFocus} placeholder="e.g. Lahan-10, Siraha" />

      <Text style={{ fontWeight: "800", marginTop: 18, marginBottom: 4, color: colors.navy }}>What service do you provide?</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>Tap one. You can add more after verification.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {services.map((item) => {
          const on = item.key === serviceType;
          return (
            <PressScale
              key={item.key}
              onPress={() => setServiceType(item.key)}
              style={{
                width: SERVICE_CARD_W,
                backgroundColor: on ? "#E4F6EA" : colors.white,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1.5,
                borderColor: on ? GREEN : colors.border,
                ...shadow.card,
              }}
            >
              {on ? (
                <View style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              ) : null}
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: on ? GREEN : colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={item.icon} size={18} color={on ? "#fff" : GREEN} />
              </View>
              <Text style={{ fontWeight: "800", marginTop: 8, color: on ? GREEN : colors.navy }} numberOfLines={1}>
                {item.key}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                {item.hint}
              </Text>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

function ContactStep({
  contact,
  setContact,
  phone,
  setPhone,
  email,
  setEmail,
  onFocus,
}: {
  contact: string;
  setContact: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  onFocus: () => void;
}) {
  return (
    <View>
      <Tip text="Buyers will use this phone and email to reach you after you are verified." />
      <Field label="Phone number" hint="Nepal mobile number" icon="call-outline" value={phone} onChangeText={setPhone} onFocus={onFocus} keyboardType="phone-pad" placeholder="98XXXXXXXX" prefix="+977" />
      <Field label="Email" hint="We send verification updates here" icon="mail-outline" value={email} onChangeText={setEmail} onFocus={onFocus} keyboardType="email-address" placeholder="you@email.com" />
      <Field label="WhatsApp / secondary contact" hint="Optional extra number or ID" icon="logo-whatsapp" value={contact} onChangeText={setContact} onFocus={onFocus} placeholder="WhatsApp number" />
    </View>
  );
}

function DocumentStep({
  nagrita,
  nagritaBack,
  photo,
  fullName,
  phone,
  email,
  serviceType,
  onPick,
}: {
  nagrita: string;
  nagritaBack: string;
  photo: string;
  fullName: string;
  phone: string;
  email: string;
  serviceType: string;
  onPick: (kind: "nagrita" | "nagrita_back" | "photo") => void;
}) {
  return (
    <View>
      <Tip text="Clear photos help admin approve you on the same day." />
      <UploadCard
        title="Nagrita / Citizenship — front"
        hint="Front side, all text readable"
        uri={nagrita}
        icon="id-card-outline"
        onPress={() => onPick("nagrita")}
      />
      <UploadCard
        title="Nagrita / Citizenship — back"
        hint="Back side, all text readable"
        uri={nagritaBack}
        icon="documents-outline"
        onPress={() => onPick("nagrita_back")}
      />
      <UploadCard title="Your photo" hint="Clear face photo, like a passport shot" uri={photo} icon="camera-outline" onPress={() => onPick("photo")} />

      <View style={{ marginTop: 16, backgroundColor: "#F6F8F7", borderRadius: 16, padding: 14 }}>
        <Text style={{ fontWeight: "800", color: colors.navy, marginBottom: 8 }}>Review before submit</Text>
        <ReviewRow label="Name" value={fullName} />
        <ReviewRow label="Phone" value={phone} />
        <ReviewRow label="Email" value={email} />
        <ReviewRow label="Service" value={serviceType} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 12 }}>
        Status will be Pending until NAJIK admin verifies your account.
      </Text>
    </View>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: "#EAF7EE", borderRadius: 14, padding: 12, flexDirection: "row", gap: 10, marginTop: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="bulb" size={14} color="#fff" />
      </View>
      <Text style={{ flex: 1, color: "#146B32", fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.navy, fontWeight: "700", fontSize: 12, maxWidth: "70%", textAlign: "right" }}>{value || "—"}</Text>
    </View>
  );
}

function Field({
  label,
  hint,
  icon,
  value,
  onChangeText,
  onFocus,
  placeholder,
  keyboardType,
  prefix,
}: {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  onFocus: () => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontWeight: "700", color: colors.navy }}>{label}</Text>
      {hint ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: 8 }}>{hint}</Text> : <View style={{ height: 8 }} />}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1.5,
          borderColor: focused ? GREEN : colors.border,
          backgroundColor: colors.white,
          borderRadius: 14,
          height: 52,
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        <Ionicons name={icon} size={18} color={active ? GREEN : colors.muted} />
        {prefix ? <Text style={{ fontWeight: "800", color: colors.navy }}>{prefix}</Text> : null}
        {prefix ? <View style={{ width: 1, height: 22, backgroundColor: colors.border }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocused(true);
            onFocus();
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
          style={{ flex: 1, color: colors.text }}
        />
        {value ? <Ionicons name="checkmark-circle" size={18} color={GREEN} /> : null}
      </View>
    </View>
  );
}

function UploadCard({
  title,
  hint,
  uri,
  icon,
  onPress,
}: {
  title: string;
  hint: string;
  uri: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        marginTop: 12,
        borderWidth: 1.5,
        borderColor: uri ? GREEN : colors.border,
        borderStyle: uri ? "solid" : "dashed",
        borderRadius: 16,
        padding: 14,
        backgroundColor: uri ? "#F3FBF5" : colors.white,
      }}
    >
      {uri ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", color: GREEN }}>{title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Uploaded · tap to replace</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={GREEN} />
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#E4F6EA", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={icon} size={24} color={GREEN} />
          </View>
          <Text style={{ fontWeight: "800", marginTop: 10, color: colors.navy }}>{title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text>
          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
            <View style={{ borderWidth: 1, borderColor: GREEN, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="camera-outline" size={14} color={GREEN} />
              <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>Camera</Text>
            </View>
            <View style={{ backgroundColor: GREEN, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="images-outline" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Gallery</Text>
            </View>
          </View>
        </View>
      )}
    </PressScale>
  );
}
