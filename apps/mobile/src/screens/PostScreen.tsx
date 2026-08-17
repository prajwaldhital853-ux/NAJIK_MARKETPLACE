import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { canPostServices, isProvider } from "../demo";
import { colors } from "../theme";

const steps = [
  { key: "Basic Info", icon: "home-outline" },
  { key: "Details", icon: "list-outline" },
  { key: "Pricing", icon: "pricetag-outline" },
  { key: "Media", icon: "image-outline" },
  { key: "Review", icon: "checkmark-circle-outline" },
];

const categories = [
  { key: "For Sale", icon: "home-outline" },
  { key: "For Rent", icon: "key-outline" },
  { key: "Land", icon: "leaf-outline" },
  { key: "Commercial", icon: "business-outline" },
];

const features = ["3 Bedrooms", "2 Bathrooms", "1 Kitchen", "Car Parking"];

export function PostScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [category, setCategory] = useState("For Sale");
  const [title, setTitle] = useState("Modern 3 BHK House for Sale in Lazimpat, Kathmandu");
  const [address, setAddress] = useState("Lazimpat, Kathmandu, Bagmati, Nepal");
  const [desc, setDesc] = useState("Spacious modern house with parking, near schools and market.");

  if (isProvider(user) && !canPostServices(user)) {
    const rejected = user?.verification_status === "rejected";
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader right="draft" showPro onClose={() => navigation.jumpTo("Home")} />
        <View style={{ padding: 24, alignItems: "center" }}>
          <Ionicons name={rejected ? "close-circle-outline" : "time-outline"} size={48} color={rejected ? colors.red : colors.orange} />
          <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 12, textAlign: "center" }}>
            {rejected ? "Application not approved" : "Waiting for admin verification"}
          </Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 8 }}>
            {rejected
              ? "NAJIK admin rejected this application. You cannot post services yet."
              : "You cannot post services until NAJIK admin verifies your nagrita, photo and details."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader right="draft" showPro onClose={() => navigation.jumpTo("Home")} />
      <KeyboardScreen style={{ backgroundColor: colors.white }} contentStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={{ marginBottom: 8 }}>
          <View style={{ position: "absolute", left: 18, right: 18, top: 16, height: 2, backgroundColor: colors.border }} />
          <View style={{ position: "absolute", left: 18, width: "18%", top: 16, height: 2, backgroundColor: "#1B7D2C" }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {steps.map((step, index) => {
              const on = index === 0;
              return (
                <View key={step.key} style={{ alignItems: "center", flex: 1 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: on ? "#1B7D2C" : colors.white, borderWidth: 1.5, borderColor: on ? "#1B7D2C" : colors.border, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={step.icon as keyof typeof Ionicons.glyphMap} size={16} color={on ? "#fff" : colors.muted} />
                  </View>
                  <Text style={{ fontSize: 9, marginTop: 4, fontWeight: on ? "800" : "600", color: on ? "#1B7D2C" : colors.muted }}>{step.key}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 14, backgroundColor: "#EAF7EE", borderRadius: 16, padding: 14, flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.navy }}>Let's create a listing that gets you more leads!</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}>Provide accurate information to build trust and attract serious buyers or tenants.</Text>
          </View>
          <View style={{ width: 118, backgroundColor: "#D4EFDC", borderRadius: 12, padding: 8 }}>
            <Text style={{ color: "#146B32", fontSize: 11, fontWeight: "800" }}>Pro Tips</Text>
            <Text style={{ color: "#146B32", fontSize: 10, marginTop: 4 }}>Listings with complete details get up to 3x more inquiries.</Text>
            <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 10, marginTop: 6 }}>Learn more →</Text>
          </View>
        </View>

        <Text style={{ fontWeight: "800", marginTop: 18, marginBottom: 10, color: colors.navy }}>What do you want to list?</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {categories.map((item) => {
            const on = item.key === category;
            const tint = item.key === "For Rent" ? colors.blue : item.key === "Commercial" ? colors.purple : "#1B7D2C";
            return (
              <PressScale
                key={item.key}
                onPress={() => setCategory(item.key)}
                style={{
                  flex: 1,
                  backgroundColor: colors.white,
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 6,
                  borderWidth: 1.5,
                  borderColor: on ? "#1B7D2C" : colors.border,
                  alignItems: "center",
                }}
              >
                {on ? (
                  <View style={{ position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: "#1B7D2C", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                ) : null}
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={on ? "#1B7D2C" : tint} />
                <Text style={{ fontWeight: "800", marginTop: 8, fontSize: 11, color: on ? "#1B7D2C" : colors.navy }}>{item.key}</Text>
              </PressScale>
            );
          })}
        </View>

        <Text style={{ fontWeight: "700", marginTop: 14, color: colors.navy }}>What type of property?</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: -4, marginBottom: 8 }}>Select the property type you want to list.</Text>
        <Field value="House" icon="home-outline" chevron />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontWeight: "700", color: colors.navy }}>Property Title</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Enter a catchy and clear title for your property.</Text>
          </View>
          <Text style={{ color: "#1B7D2C", fontSize: 11, fontWeight: "700" }}>{title.length}/60</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <FormInput value={title} onChangeText={setTitle} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
          <View>
            <Text style={{ fontWeight: "700", color: colors.navy }}>Location</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Where is your property located?</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="navigate" size={14} color="#1B7D2C" />
            <Text style={{ color: "#1B7D2C", fontWeight: "700", fontSize: 12 }}>Use current location</Text>
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <Field value={address} onChangeText={setAddress} icon="location" />
        </View>

        <View style={{ marginTop: 12, height: 128, borderRadius: 14, overflow: "hidden" }}>
          <Image source={{ uri: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80" }} style={{ width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="location" size={36} color="#1B7D2C" />
          </View>
          <View style={{ position: "absolute", left: 10, bottom: 10, backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.green }}>
            <Ionicons name="move" size={12} color="#1B7D2C" />
            <Text style={{ color: "#1B7D2C", fontWeight: "700", fontSize: 11 }}>Move pin on map</Text>
          </View>
          <View style={{ position: "absolute", right: 10, bottom: 10, backgroundColor: "rgba(20,40,30,0.72)", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="eye" size={12} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>View on map</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
          <View>
            <Text style={{ fontWeight: "700", color: colors.navy }}>Short Description</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Highlight the best features of your property.</Text>
          </View>
          <Text style={{ color: "#1B7D2C", fontSize: 11, fontWeight: "700" }}>{desc.length}/1000</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <FormInput value={desc} onChangeText={setDesc} multiline />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {features.map((tag) => (
            <View key={tag} style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="checkmark-circle-outline" size={12} color={colors.muted} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>{tag}</Text>
            </View>
          ))}
          <View style={{ borderWidth: 1.5, borderColor: colors.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <Text style={{ color: colors.green, fontWeight: "700", fontSize: 12 }}>+ Add Feature</Text>
          </View>
        </View>
      </KeyboardScreen>

      <View style={{ flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }}>
        <PressScale style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="close" size={14} color={colors.text} />
          <Text style={{ fontWeight: "700" }}>Cancel</Text>
        </PressScale>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: "#1B7D2C", fontSize: 12, fontWeight: "800" }}>Step 1 of 5</Text>
          <Text style={{ color: colors.muted, fontSize: 10 }}>Basic Information</Text>
        </View>
        <PressScale style={{ backgroundColor: "#1B7D2C", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>Next: Details</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </PressScale>
      </View>
    </View>
  );
}

function FormInput({
  value,
  onChangeText,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
}) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onFocus={onInputFocus}
      multiline={multiline}
      style={{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        color: colors.text,
        minHeight: multiline ? 90 : undefined,
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

function Field({
  value,
  onChangeText,
  icon,
  chevron,
}: {
  value: string;
  onChangeText?: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  chevron?: boolean;
}) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8 }}>
      <Ionicons name={icon} size={16} color={colors.green} />
      <TextInput value={value} onChangeText={onChangeText} onFocus={onInputFocus} editable={!!onChangeText} style={{ flex: 1, color: colors.text }} />
      {chevron ? <Ionicons name="chevron-down" size={16} color={colors.muted} /> : null}
    </View>
  );
}
