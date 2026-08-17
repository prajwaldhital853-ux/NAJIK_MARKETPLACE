import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Alert, Image, Linking, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { inquiries } from "../data/mock";
import { openSellerPage } from "../navigation/browse";
import { colors, shadow } from "../theme";
import type { Inquiry } from "../types";

const houseArt = require("../../assets/hero/house.png");

const listingThumbs: Record<string, number> = {
  i1: require("../../assets/listings/flat.jpg"),
  i2: require("../../assets/listings/modern.jpg"),
  i3: require("../../assets/listings/apartment.jpg"),
};

const pills = ["All (128)", "New (12)", "In Progress (24)", "Responded (68)", "Closed (24)"];

const stats = [
  { value: "128", label: "Total Inquiries", note: "All time", color: "#1B7D2C", bg: "#E4F6EA", icon: "chatbubbles" as const },
  { value: "12", label: "New Inquiries", note: "Require attention", color: "#2563EB", bg: "#E8F1FE", icon: "chatbubble" as const },
  { value: "24", label: "In Progress", note: "Active now", color: "#EA580C", bg: "#FFF1E0", icon: "time" as const },
  { value: "68", label: "Responded", note: "This month", color: "#16A34A", bg: "#E4F6EA", icon: "checkmark-circle" as const },
];

const pillTone: Record<Inquiry["status"], { fg: string; bg: string }> = {
  New: { fg: "#1B7D2C", bg: "#E4F6EA" },
  "In Progress": { fg: "#2563EB", bg: "#E8F1FE" },
  Responded: { fg: "#7C3AED", bg: "#F1E9FF" },
  Closed: { fg: "#6B7280", bg: "#EEF0F3" },
};

const activityDot: Record<Inquiry["status"], string> = {
  New: "#E53935",
  "In Progress": "#F59E0B",
  Responded: "#22A34A",
  Closed: "#9AA0A6",
};

export function InquiriesScreen() {
  const [pill, setPill] = useState(pills[0]);
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader bellCount={5} />
      <KeyboardScreen adjustKeyboardInsets={false} contentStyle={{ padding: 16, paddingTop: 8, paddingBottom: 72 }}>
        <InquiriesBody pill={pill} setPill={setPill} />
      </KeyboardScreen>

      <PressScale
        onPress={() => openSellerPage(navigation, "messages")}
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          backgroundColor: "#1B7D2C",
          borderRadius: 22,
          paddingHorizontal: 12,
          paddingVertical: 9,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          ...shadow.fab,
        }}
      >
        <Ionicons name="sparkles" size={13} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Quick Reply</Text>
      </PressScale>
    </View>
  );
}

function InquiriesBody({ pill, setPill }: { pill: string; setPill: (value: string) => void }) {
  const { onInputFocus } = useKeyboardScroll();
  const [query, setQuery] = useState("");
  const status = pill.startsWith("New")
    ? "New"
    : pill.startsWith("In Progress")
      ? "In Progress"
      : pill.startsWith("Responded")
        ? "Responded"
        : pill.startsWith("Closed")
          ? "Closed"
          : "All";
  const list = inquiries.filter((item) => {
    if (status !== "All" && item.status !== status) return false;
    const hay = `${item.name} ${item.listingTitle} ${item.message}`.toLowerCase();
    return !query.trim() || hay.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 }}>
        <Image source={houseArt} style={{ width: 72, height: 56, resizeMode: "contain" }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.navy }}>Inquiries</Text>
          <Text style={{ color: "#8A8F98", marginTop: 3, fontSize: 12 }}>
            Manage and respond to customer inquiries.
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingHorizontal: 10,
            height: 42,
            borderWidth: 1,
            borderColor: "#E6E8EC",
          }}
        >
          <Ionicons name="search" size={15} color="#9AA0A6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, listing or inquiry ID..."
            placeholderTextColor="#9AA0A6"
            onFocus={onInputFocus}
            style={{ flex: 1, marginLeft: 8, fontSize: 12, color: colors.navy }}
          />
        </View>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E6E8EC",
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="calendar-outline" size={16} color="#4B5563" />
        </View>
        <View
          style={{
            height: 42,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E6E8EC",
            backgroundColor: "#fff",
            paddingHorizontal: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <View>
            <Ionicons name="funnel-outline" size={14} color="#4B5563" />
            <View style={{ position: "absolute", top: -1, right: -1, width: 6, height: 6, borderRadius: 3, backgroundColor: "#1B7D2C" }} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#4B5563" }}>Filter</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
        {pills.map((item) => {
          const on = item === pill;
          return (
            <PressScale
              key={item}
              onPress={() => setPill(item)}
              style={{
                backgroundColor: on ? "#1B7D2C" : "#fff",
                borderWidth: 1,
                borderColor: on ? "#1B7D2C" : "#E6E8EC",
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: on ? "#fff" : "#4B5563", fontWeight: "700", fontSize: 11 }}>{item}</Text>
            </PressScale>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 6 }}>
        {stats.map((item) => (
          <View key={item.label} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 7, paddingTop: 8, paddingBottom: 4, overflow: "hidden", ...shadow.card }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon} size={11} color={item.color} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: item.color, marginTop: 5 }}>{item.value}</Text>
            <Text style={{ color: "#6B7280", fontSize: 8, marginTop: 1 }} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={{ color: "#9AA0A6", fontSize: 7, marginTop: 1 }} numberOfLines={1}>
              {item.note}
            </Text>
            <Sparkline color={item.color} />
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: 14,
          backgroundColor: "#E7F6EC",
          borderRadius: 16,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#1B7D2C", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="star" size={15} color="#fff" />
        </View>
        <Text style={{ flex: 1, color: colors.navy, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>
          Great job! 🎉 You replied to 18 more inquiries this week compared to last week.
        </Text>
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: "#1B7D2C", flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="bar-chart" size={12} color="#1B7D2C" />
          <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 11 }}>View Insights</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.navy }}>Recent Inquiries</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#8A8F98", fontSize: 12 }}>Sort by:</Text>
          <Text style={{ color: colors.navy, fontSize: 12, fontWeight: "700" }}>Newest</Text>
          <Ionicons name="chevron-down" size={12} color="#8A8F98" />
        </View>
      </View>

      {list.map((item) => (
        <InquiryCard key={item.id} item={item} />
      ))}
    </>
  );
}

function Sparkline({ color }: { color: string }) {
  return (
    <Svg width="100%" height={16} viewBox="0 0 80 16" style={{ marginTop: 4 }}>
      <Path d="M0 16 L0 11 C10 11 14 5 26 6 C38 7 42 13 54 9 C66 5 70 7 80 3 L80 16 Z" fill={color} opacity={0.12} />
      <Path d="M0 11 C10 11 14 5 26 6 C38 7 42 13 54 9 C66 5 70 7 80 3" stroke={color} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

function InquiryCard({ item }: { item: Inquiry }) {
  const tone = pillTone[item.status];
  const dot = activityDot[item.status];
  const actionIcon =
    item.action === "Reply" ? "chatbubble-outline" : item.action === "View Chat" ? "chatbubbles-outline" : "eye-outline";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState("");
  const { onInputFocus } = useKeyboardScroll();
  const navigation = useNavigation<any>();

  return (
    <View
      style={{ backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 12, ...shadow.card }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View>
          <Image source={{ uri: item.avatar }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8EEF0" }} />
          <View
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: dot,
              borderWidth: 2,
              borderColor: "#fff",
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontWeight: "800", color: colors.navy, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={{ backgroundColor: tone.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ color: tone.fg, fontSize: 9, fontWeight: "800" }}>{item.status}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="call-outline" size={11} color="#9AA0A6" />
              <Text style={{ color: "#8A8F98", fontSize: 11 }}>{item.phone}</Text>
            </View>
            {item.email ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons name="mail-outline" size={11} color="#9AA0A6" />
                <Text style={{ color: "#8A8F98", fontSize: 11 }}>{item.email}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
          <Text style={{ color: "#8A8F98", fontSize: 10 }}>{item.time}</Text>
        </View>
      </View>

      <Text style={{ color: "#5F6368", fontSize: 12, marginTop: 10, lineHeight: 17 }} numberOfLines={2}>
        {item.message}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F6F8F7", borderRadius: 12, padding: 7 }}>
          <Image
            source={listingThumbs[item.id] ?? { uri: item.listingImage }}
            style={{ width: 48, height: 36, borderRadius: 8, backgroundColor: "#E8EEF0" }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 11, color: colors.navy }} numberOfLines={1}>
              {item.listingTitle}
            </Text>
            <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 11 }}>{item.listingPrice}</Text>
          </View>
        </View>
        <PressScale
          onPress={() => {
            if (item.action === "Reply") setOpen((v) => !v);
            else if (item.action === "View Chat") openSellerPage(navigation, "messages");
            else Alert.alert(item.listingTitle, item.message);
          }}
          style={{
            borderWidth: 1.5,
            borderColor: "#1B7D2C",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Ionicons name={actionIcon} size={12} color="#1B7D2C" />
          <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 11 }}>{item.action}</Text>
        </PressScale>
      </View>
      {open ? (
        <View style={{ marginTop: 10 }}>
          {sent ? <Text style={{ color: "#1B7D2C", fontSize: 12, marginBottom: 6 }}>Sent: {sent}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onFocus={onInputFocus}
              placeholder="Write a reply..."
              placeholderTextColor="#9AA0A6"
              style={{ flex: 1, backgroundColor: "#F7F8FA", borderRadius: 12, paddingHorizontal: 10, height: 40, fontSize: 12 }}
            />
            <PressScale
              onPress={() => {
                if (!draft.trim()) return;
                setSent(draft.trim());
                setDraft("");
              }}
              style={{ backgroundColor: "#1B7D2C", borderRadius: 12, paddingHorizontal: 12, justifyContent: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Send</Text>
            </PressScale>
          </View>
          <PressScale onPress={() => Linking.openURL("tel:+9779812345678")} style={{ marginTop: 8 }}>
            <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: 12 }}>Call {item.phone}</Text>
          </PressScale>
        </View>
      ) : null}
    </View>
  );
}
