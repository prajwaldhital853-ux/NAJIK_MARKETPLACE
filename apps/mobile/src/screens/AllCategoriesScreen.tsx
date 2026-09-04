import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressScale } from "../components/PressScale";
import { ALL_CATEGORY_TILES, type BrowseCategoryTile } from "../data/allCategories";
import { openCategory } from "../navigation/browse";

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 12;
const COLS = 3;
const CARD_W = (SCREEN_W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const SQUIRCLE = Math.min(72, CARD_W - 28);
const ICON = Math.round(SQUIRCLE * 0.78);

export function AllCategoriesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  function openTile(tile: BrowseCategoryTile) {
    openCategory(navigation, tile.key, tile.filter);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
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
        <Section tiles={ALL_CATEGORY_TILES} onPress={openTile} />
      </ScrollView>
    </View>
  );
}

function Section({
  tiles,
  onPress,
}: {
  tiles: BrowseCategoryTile[];
  onPress: (tile: BrowseCategoryTile) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {tiles.map((tile) => (
        <PressScale
          key={tile.id}
          onPress={() => onPress(tile)}
          style={{
            width: CARD_W,
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#ECEEF2",
            paddingTop: 14,
            paddingBottom: 12,
            paddingHorizontal: 8,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: SQUIRCLE,
              height: SQUIRCLE,
              borderRadius: 22,
              backgroundColor: "#E8EEF8",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image source={tile.image} style={{ width: ICON, height: ICON }} contentFit="contain" />
          </View>
          <Text
            style={{
              fontWeight: "700",
              fontSize: 12,
              color: "#1F2937",
              textAlign: "center",
              marginTop: 10,
              lineHeight: 16,
            }}
            numberOfLines={2}
          >
            {tile.label}
          </Text>
        </PressScale>
      ))}
    </View>
  );
}
