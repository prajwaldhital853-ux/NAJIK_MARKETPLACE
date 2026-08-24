import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { View, Text } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { InviteEarnBody } from "../components/InviteEarnBody";
import { KeyboardScreen } from "../components/KeyboardScreen";

const GREEN = "#1B7D2C";

export function BuyerInviteEarnScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader onClose={() => navigation.goBack()} right="bell-settings" showPro={false} pinColor={GREEN} />
      <KeyboardScreen fill={false} contentStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="gift-outline" size={20} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 20, color: "#111827" }}>Invite & Earn</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>Share your code and earn when friends join NAJIK.</Text>
          </View>
        </View>
        <InviteEarnBody audience="user" />
      </KeyboardScreen>
    </View>
  );
}
