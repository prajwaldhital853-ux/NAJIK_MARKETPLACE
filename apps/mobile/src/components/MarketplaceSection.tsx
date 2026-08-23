import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, ActivityIndicator } from "react-native";
import type { CatalogItem } from "../data/catalog";
import { colors } from "../theme";
import { ListingGrid, ListingList, ListingRail } from "./ClassifiedCard";
import { PressScale } from "./PressScale";

const BLUE = "#2563EB";
const TITLE = "#111827";

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  items: CatalogItem[];
  mode?: "rail" | "list" | "grid";
  chips?: { key: string; label: string }[];
  activeChip?: string;
  onChip?: (key: string) => void;
  onViewMore?: () => void;
  viewMoreLabel?: string;
  viewMoreColor?: string;
  emptyText?: string;
  limit?: number;
  loading?: boolean;
};

export function MarketplaceSection({
  title,
  icon = "grid-outline",
  iconColor = BLUE,
  items,
  mode = "rail",
  chips,
  activeChip,
  onChip,
  onViewMore,
  viewMoreLabel = "View All ›",
  viewMoreColor = BLUE,
  emptyText,
  limit = 10,
  loading = false,
}: Props) {
  if (!items.length && !emptyText && !chips && !loading) return null;

  const displayItems = items.slice(0, limit);

  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: chips ? 12 : 14 }}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={{ flex: 1, marginLeft: 8, fontSize: 20, fontWeight: "900", color: TITLE, letterSpacing: -0.3 }} numberOfLines={1}>
          {title}
        </Text>
        {onViewMore ? (
          <PressScale onPress={onViewMore}>
            <Text style={{ color: viewMoreColor, fontWeight: "800", fontSize: 13 }}>{viewMoreLabel}</Text>
          </PressScale>
        ) : null}
      </View>

      {chips?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {chips.map((chip) => {
            const on = chip.key === activeChip;
            return (
              <PressScale
                key={chip.key}
                onPress={() => onChip?.(chip.key)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? BLUE : "#EEF0F3" }}
              >
                <Text style={{ fontWeight: "700", fontSize: 12, color: on ? "#fff" : "#374151" }}>{chip.label}</Text>
              </PressScale>
            );
          })}
        </ScrollView>
      ) : null}

      {!displayItems.length ? (
        loading ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[0, 1].map((slot) => (
              <View key={slot} style={{ width: 168, height: 210, borderRadius: 16, backgroundColor: "#EEF0F3" }} />
            ))}
            <ActivityIndicator color={BLUE} style={{ alignSelf: "center", marginLeft: 8 }} />
          </View>
        ) : emptyText ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16 }}>
            <Text style={{ color: colors.muted, textAlign: "center", fontSize: 13 }}>{emptyText}</Text>
          </View>
        ) : null
      ) : mode === "grid" ? (
        <ListingGrid items={displayItems} />
      ) : mode === "list" ? (
        <ListingList items={displayItems} />
      ) : (
        <ListingRail items={displayItems} />
      )}
    </View>
  );
}
