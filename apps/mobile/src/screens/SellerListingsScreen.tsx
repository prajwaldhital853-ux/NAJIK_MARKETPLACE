import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InfiniteListingGrid } from "../components/InfiniteListingGrid";
import { fetchMyListingsPaginated } from "../listingsApi";
import { colors } from "../theme";

export function SellerListingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>My Listings</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <InfiniteListingGrid
          fetchData={fetchMyListingsPaginated}
          emptyText="You haven't posted any listings yet. Tap the + button to create your first listing."
          showPromoted={true}
          pageSize={20}
        />
      </View>
    </View>
  );
}