import { View } from "react-native";
import { LISTING_CARD_W } from "./ClassifiedCard";

const GAP = 11;

export function ProductSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={{
            width: LISTING_CARD_W,
            borderRadius: 16,
            backgroundColor: "#fff",
            overflow: "hidden",
          }}
        >
          <View style={{ width: "100%", height: Math.round(LISTING_CARD_W * 0.68), backgroundColor: "#E8EEF0" }} />
          <View style={{ padding: 10, gap: 8 }}>
            <View style={{ height: 12, borderRadius: 6, backgroundColor: "#EEF0F3", width: "86%" }} />
            <View style={{ height: 12, borderRadius: 6, backgroundColor: "#EEF0F3", width: "54%" }} />
            <View style={{ height: 10, borderRadius: 6, backgroundColor: "#F3F4F6", width: "40%" }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProductSkeletonBlock() {
  return (
    <View style={{ paddingVertical: 8 }}>
      <ProductSkeleton count={6} />
    </View>
  );
}
