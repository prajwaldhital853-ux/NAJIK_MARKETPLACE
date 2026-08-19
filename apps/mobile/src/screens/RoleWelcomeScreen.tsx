import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CitySkyline } from "../components/CitySkyline";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { colors, shadow } from "../theme";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 24 - 8) / 2;

const W = {
  green: "#1B8526",
  greenSoft: "#EAF7EE",
  greenBorder: "#B8DFC2",
  blue: "#0052CC",
  blueSoft: "#E8F1FC",
  blueBorder: "#B8CFEE",
  title: "#1C1C1C",
  body: "#6B7280",
  muted: "#8A9199",
  bg: "#FFFFFF",
};

export function RoleWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 12, alignItems: "center" }}>
          <PressScale
            onPress={() => navigation.navigate("Login")}
            style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={W.title} />
            <Text style={{ fontWeight: "700", color: W.title }}>Back to login</Text>
          </PressScale>
          <NajikWordmark />

          <Text style={{ marginTop: 22, fontSize: 26, fontWeight: "800", color: W.title, textAlign: "center" }}>
            Welcome to <Text style={{ color: W.green }}>Najik</Text>
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              lineHeight: 22,
              color: W.body,
              textAlign: "center",
              maxWidth: 300,
            }}
          >
            Your one-stop platform for property,{"\n"}vehicles, jobs, services and more.
          </Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <CitySkyline />
        </View>

        <View
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            marginTop: -36,
            paddingHorizontal: 12,
            paddingTop: 22,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
            <View style={{ width: 32, height: 1.5, backgroundColor: W.green }} />
            <Text style={{ fontWeight: "600", color: W.title, fontSize: 13 }}>Choose how you want to continue</Text>
            <View style={{ width: 32, height: 1.5, backgroundColor: W.green }} />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <RoleCard
              highlight="User"
              accent={W.green}
              softBg={W.greenSoft}
              borderColor={W.greenBorder}
              description="Find properties, vehicles, jobs, services and more."
              button="Continue as User"
              icon="person"
              onPress={() => navigation.navigate("Register", { accountType: "user" })}
            />
            <RoleCard
              highlight="Service Provider"
              accent={W.blue}
              softBg={W.blueSoft}
              borderColor={W.blueBorder}
              description="Offer your services, reach more customers and grow your business."
              button="Continue as Service Provider"
              icon="briefcase"
              onPress={() => navigation.navigate("Register", { accountType: "provider" })}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 18 }}>
            <Ionicons name="shield-checkmark" size={16} color={W.green} />
            <Text style={{ color: W.muted, fontSize: 13 }}>
              We keep your data <Text style={{ color: W.green, fontWeight: "800" }}>safe and secure</Text>
            </Text>
          </View>

          <PressScale
            onPress={() => navigation.navigate("Login")}
            style={{
              marginTop: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: colors.white,
              ...shadow.card,
            }}
          >
            <Text style={{ color: W.title, fontWeight: "700", fontSize: 14 }}>
              Already have an account? <Text style={{ color: W.green }}>Login →</Text>
            </Text>
          </PressScale>
        </View>
      </ScrollView>
    </View>
  );
}

function RoleCard({
  highlight,
  accent,
  softBg,
  borderColor,
  description,
  button,
  icon,
  onPress,
}: {
  highlight: string;
  accent: string;
  softBg: string;
  borderColor: string;
  description: string;
  button: string;
  icon: "person" | "briefcase";
  onPress: () => void;
}) {
  const compact = highlight !== "User";

  return (
    <PressScale onPress={onPress} style={{ width: CARD_W }}>
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingTop: 16,
          paddingBottom: 12,
          borderWidth: 1.5,
          borderColor,
          minHeight: 268,
          alignItems: "center",
          ...shadow.card,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: softBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={compact ? 26 : 28} color={accent} />
        </View>

        <Text style={{ marginTop: 12, fontSize: 13, color: W.body, fontWeight: "500" }}>I am a</Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: compact ? 15 : 20,
            color: accent,
            fontWeight: "800",
            textAlign: "center",
            lineHeight: compact ? 18 : 24,
          }}
        >
          {highlight}
        </Text>

        <View style={{ width: 36, height: 2.5, backgroundColor: accent, borderRadius: 2, marginTop: 6 }} />

        <Text
          style={{
            marginTop: 10,
            color: W.body,
            fontSize: 11,
            lineHeight: 15,
            textAlign: "center",
            flex: 1,
            paddingHorizontal: 2,
          }}
        >
          {description}
        </Text>

        <View
          style={{
            marginTop: 12,
            width: "100%",
            backgroundColor: accent,
            borderRadius: 12,
            paddingVertical: 13,
            paddingHorizontal: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            minHeight: 46,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: compact ? 10 : 11.5, textAlign: "center", lineHeight: 14, flexShrink: 1 }}>
            {button}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </View>
    </PressScale>
  );
}
