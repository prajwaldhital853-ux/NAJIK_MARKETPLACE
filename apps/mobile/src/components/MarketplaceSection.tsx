import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
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
  emptyText?: string;
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
  emptyText,
}: Props) {
  const railRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const maxOffsetRef = useRef(0);

  if (!items.length && !emptyText && !chips) return null;

  const canScrollRail = mode === "rail" && items.length > 1;

  function onRailScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    offsetRef.current = e.nativeEvent.contentOffset.x;
    const { contentSize, layoutMeasurement } = e.nativeEvent;
    maxOffsetRef.current = Math.max(0, contentSize.width - layoutMeasurement.width);
  }

  function scrollRail(dir: -1 | 1) {
    if (!railRef.current) return;
    const step = 180;
    const next = Math.max(0, Math.min(maxOffsetRef.current || 9999, offsetRef.current + dir * step));
    railRef.current.scrollTo({ x: next, animated: true });
    offsetRef.current = next;
  }

  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: chips ? 12 : 14 }}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text
          style={{
            flex: 1,
            marginLeft: 8,
            fontSize: 20,
            fontWeight: "900",
            color: TITLE,
            letterSpacing: -0.3,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {onViewMore ? (
            <PressScale
              onPress={onViewMore}
              style={{
                borderWidth: 1.5,
                borderColor: BLUE,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ color: BLUE, fontWeight: "700", fontSize: 12 }}>View More</Text>
            </PressScale>
          ) : null}
          {canScrollRail ? (
            <>
              <PressScale onPress={() => scrollRail(-1)} hitSlop={8} style={{ padding: 2 }}>
                <Ionicons name="arrow-back" size={18} color="#6B7280" />
              </PressScale>
              <PressScale onPress={() => scrollRail(1)} hitSlop={8} style={{ padding: 2 }}>
                <Ionicons name="arrow-forward" size={18} color="#6B7280" />
              </PressScale>
            </>
          ) : null}
        </View>
      </View>

      {chips?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {chips.map((chip) => {
            const on = chip.key === activeChip;
            return (
              <PressScale
                key={chip.key}
                onPress={() => onChip?.(chip.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: on ? BLUE : "#EEF0F3",
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 12, color: on ? "#fff" : "#374151" }}>{chip.label}</Text>
              </PressScale>
            );
          })}
        </ScrollView>
      ) : null}

      {!items.length ? (
        emptyText ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16 }}>
            <Text style={{ color: colors.muted, textAlign: "center", fontSize: 13 }}>{emptyText}</Text>
          </View>
        ) : null
      ) : mode === "grid" ? (
        <ListingGrid items={items} />
      ) : mode === "list" ? (
        <ListingList items={items} />
      ) : (
        <ListingRail items={items} scrollRef={railRef} onScroll={onRailScroll} />
      )}
    </View>
  );
}
