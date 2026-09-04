import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryIconBubble } from "../components/CategoryIconBubble";
import { PressScale } from "../components/PressScale";
import { OTHER_CATEGORY_TILES, VEHICLE_CATEGORY_TILES, type BrowseCategoryTile } from "../data/allCategories";
import { openCategory } from "../navigation/browse";

const GREEN = "#1B7D2C";
const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 10;
const COLS = 3;
const CARD_W = (SCREEN_W - PAD * 2 - GAP * (COLS - 1)) / COLS;

export function AllCategoriesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  function openTile(tile: BrowseCategoryTile) {
    openCategory(navigation, tile.key, tile.filter);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 12,
          paddingBottom: 12,
          backgroundColor: "#fff",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <PressScale onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </PressScale>
        <Text style={{ fontWeight: "800", fontSize: 18, color: "#111827" }}>Categories</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: Math.max(insets.bottom, 28) }}>
        <Section title="Vehicles & Property" tiles={VEHICLE_CATEGORY_TILES} onPress={openTile} />
        <Section title="Others" tiles={OTHER_CATEGORY_TILES} onPress={openTile} />
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  tiles,
  onPress,
}: {
  title: string;
  tiles: BrowseCategoryTile[];
  onPress: (tile: BrowseCategoryTile) => void;
}) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={{ fontWeight: "800", fontSize: 16, color: "#111827", marginBottom: 12 }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
        {tiles.map((tile) => (
          <PressScale
            key={tile.id}
            onPress={() => onPress(tile)}
            style={{
              width: CARD_W,
              backgroundColor: "#fff",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 78,
                backgroundColor: tile.tint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {tile.iconKey ? (
                <CategoryIconBubble iconKey={tile.iconKey} size={52} />
              ) : (
                <Ionicons name={tile.icon} size={34} color={GREEN} />
              )}
            </View>
            <View style={{ paddingHorizontal: 6, paddingVertical: 10, minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontWeight: "700", fontSize: 11, color: "#111827", textAlign: "center" }} numberOfLines={2}>
                {tile.label}
              </Text>
            </View>
          </PressScale>
        ))}
      </View>
    </View>
  );
}
