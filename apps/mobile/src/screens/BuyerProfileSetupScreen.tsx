import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { friendlyError } from "../api";
import { useAuth } from "../context/AuthContext";
import { NEPAL_CITIES } from "../data/listingCategories";
import { requestUserPoint, reverseGeocode } from "../geo";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

export function BuyerProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { user, completeBuyerDetails, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { onInputFocus } = useKeyboardScroll();

  async function useLocation() {
    const point = await requestUserPoint();
    if (!point) {
      Alert.alert("Location", "Allow location to fill your current address, or pick a city.");
      return;
    }
    const geo = await reverseGeocode(point);
    setAddress(geo.location || [geo.city, geo.district].filter(Boolean).join(", "));
  }

  async function submit() {
    setError("");
    if (!fullName.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!address.trim()) {
      setError("Add your address.");
      return;
    }
    if (!phone.replace(/\s/g, "")) {
      setError("Phone number is required.");
      return;
    }
    setBusy(true);
    try {
      await completeBuyerDetails({
        full_name: fullName.trim(),
        phone: phone.replace(/\s/g, ""),
        address: address.trim(),
      });
    } catch (err) {
      setError(friendlyError(err, "Could not save your details."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardScreen enableRefresh={false} style={{ backgroundColor: colors.white }} contentStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
      <NajikWordmark scale={0.8} />
      <View style={{ backgroundColor: colors.white, borderRadius: 24, padding: 20, marginTop: 20, borderWidth: 1, borderColor: colors.border, ...shadow.card }}>
        <Text style={{ fontSize: 24, fontWeight: "800" }}>Complete your profile</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
          First time with this Google account. Name can replace the Google name. Phone is required.
        </Text>
        <Field icon="person-outline" placeholder="Your name" value={fullName} onChangeText={setFullName} onFocus={onInputFocus} />
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50, gap: 8 }}>
          <Ionicons name="phone-portrait-outline" size={18} color={GREEN} />
          <Text style={{ fontWeight: "700" }}>+977</Text>
          <TextInput
            placeholder="Phone number"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            onFocus={onInputFocus}
            keyboardType="phone-pad"
            style={{ flex: 1 }}
          />
        </View>
        <Field icon="location-outline" placeholder="Address" value={address} onChangeText={setAddress} onFocus={onInputFocus} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <PressScale onPress={() => void useLocation()} style={{ flex: 1, borderWidth: 1, borderColor: GREEN, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>Use my current location</Text>
          </PressScale>
          <PressScale onPress={() => setPicker(true)} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontWeight: "800", fontSize: 12 }}>Choose city</Text>
          </PressScale>
        </View>
        {error ? <Text style={{ marginTop: 10, color: colors.red }}>{error}</Text> : null}
        <PressScale
          onPress={() => void submit()}
          style={{ marginTop: 16, backgroundColor: GREEN, borderRadius: 28, height: 52, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>{busy ? "Saving…" : "Continue to NAJIK"}</Text>
        </PressScale>
        <PressScale onPress={() => void logout()} style={{ marginTop: 14, alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontWeight: "700" }}>Use a different Google account</Text>
        </PressScale>
      </View>
      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable onPress={() => setPicker(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <Pressable style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: insets.bottom + 16 }}>
            <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>Choose a city</Text>
            {NEPAL_CITIES.map((city) => (
              <PressScale
                key={city}
                onPress={() => {
                  setAddress(city === "Other" ? "" : city);
                  setPicker(false);
                }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ fontWeight: "700" }}>{city}</Text>
              </PressScale>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardScreen>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  onFocus,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onFocus: () => void;
}) {
  return (
    <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50, gap: 8 }}>
      <Ionicons name={icon} size={18} color={GREEN} />
      <TextInput placeholder={placeholder} placeholderTextColor={colors.muted} value={value} onChangeText={onChangeText} onFocus={onFocus} style={{ flex: 1 }} />
    </View>
  );
}
