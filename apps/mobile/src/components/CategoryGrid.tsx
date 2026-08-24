import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions, Text, View } from "react-native";
import { homeCategoryKey, type CatalogKey } from "../data/catalog";
import { PressScale } from "./PressScale";

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 10;
const COLS = 4;
const TILE = (SCREEN_W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CIRCLE = Math.min(52, TILE - 4);

type CategoryRow = {
  label: string;
  key: CatalogKey;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tint: string;
};

const CATEGORIES: CategoryRow[] = [
  { label: "Property", key: "property", icon: "home-city-outline", tint: "#64748B" },
  { label: "Vehicles", key: "vehicles", icon: "car-side", tint: "#64748B" },
  { label: "Jobs", key: "jobs", icon: "briefcase-outline", tint: "#64748B" },
  { label: "Services", key: "services", icon: "hammer-wrench", tint: "#64748B" },
  { label: "Used Items", key: "used", icon: "sofa-outline", tint: "#64748B" },
  { label: "Shops", key: "shops", icon: "storefront-outline", tint: "#64748B" },
  { label: "Electronics", key: "electronics", icon: "cellphone", tint: "#64748B" },
  { label: "Others", key: "others", icon: "view-grid-outline", tint: "#64748B" },
];

type Props = {
  onPress: (key: CatalogKey) => void;
  onSeeAll?: () => void;
  title?: string;
};

export function CategoryGrid({ onPress, onSeeAll, title = "Categories" }: Props) {
  return (
    <View style={{ marginTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: "#111827" }}>{title}</Text>
        {onSeeAll ? (
          <PressScale onPress={onSeeAll}>
            <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 12 }}>See all</Text>
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
            <View
              style={{
                width: CIRCLE,
                height: CIRCLE,
                borderRadius: CIRCLE / 2,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name={item.icon} size={24} color={item.tint} />
            </View>
            <Text
              style={{ fontSize: 10, fontWeight: "600", marginTop: 5, color: "#374151", textAlign: "center" }}
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
