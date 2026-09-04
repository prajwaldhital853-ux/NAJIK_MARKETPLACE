import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressScale } from "./PressScale";

const BOOK_NOW = "#FDC400";
const ADD_CART = "#F85606";

export function listingDetailFooterHeight(bottomInset: number) {
  return 54 + Math.max(bottomInset, 8);
}

export function ListingDetailFooter({
  inCart,
  onBookNow,
  onAddToCart,
}: {
  inCart: boolean;
  onBookNow: () => void;
  onAddToCart: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        flexDirection: "row",
        gap: 8,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
        zIndex: 20,
        elevation: 12,
      }}
    >
      <PressScale
        onPress={onBookNow}
        style={{
          flex: 1,
          backgroundColor: BOOK_NOW,
          borderRadius: 4,
          minHeight: 46,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Book Now</Text>
      </PressScale>
      <PressScale
        onPress={onAddToCart}
        style={{
          flex: 1.15,
          backgroundColor: ADD_CART,
          borderRadius: 4,
          minHeight: 46,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingHorizontal: 8,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{inCart ? "In Cart" : "Add to Cart"}</Text>
        {!inCart ? <Ionicons name="chevron-forward" size={16} color="#fff" /> : null}
      </PressScale>
    </View>
  );
}

export const LISTING_DETAIL_FOOTER_H = 70;
