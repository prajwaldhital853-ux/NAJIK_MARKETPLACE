import { Dimensions, Text, View } from "react-native";
import { homeCategoryKey, type CatalogKey } from "../data/catalog";
import { CategoryIconBubble } from "./CategoryIconBubble";
import { PressScale } from "./PressScale";

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 10;
const COLS = 4;
const TILE = (SCREEN_W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CIRCLE = Math.min(64, TILE - 2);

const CATEGORIES: { label: string; key: CatalogKey }[] = [
  { label: "Property", key: "property" },
  { label: "Vehicles", key: "vehicles" },
  { label: "Jobs", key: "jobs" },
  { label: "Services", key: "services" },
  { label: "Used Items", key: "used" },
  { label: "Shops", key: "shops" },
  { label: "Electronics", key: "electronics" },
  { label: "Others", key: "others" },
];

type Props = {
  onPress: (key: CatalogKey) => void;
  onSeeAll?: () => void;
  title?: string;
};

export function CategoryGrid({ onPress, onSeeAll, title = "Categories" }: Props) {
  return (
    <View style={{ marginTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: "900", color: "#111827", letterSpacing: -0.3 }}>{title}</Text>
        {onSeeAll ? (
          <PressScale onPress={onSeeAll}>
            <Text style={{ color: "#2563EB", fontWeight: "800", fontSize: 13 }}>See all</Text>
          </PressScale>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
        {CATEGORIES.map((item) => (
          <PressScale
            key={item.label}
            onPress={() => onPress(homeCategoryKey[item.label] ?? item.key)}
            style={{ width: TILE, alignItems: "center" }}
          >
            <CategoryIconBubble iconKey={item.key} size={CIRCLE} />
            <Text
              style={{ fontSize: 11, fontWeight: "600", marginTop: 6, color: "#374151", textAlign: "center" }}
              numberOfLines={2}
            >
              {item.label}
            </Text>
          </PressScale>
        ))}
      </View>
    </View>
  );
}
