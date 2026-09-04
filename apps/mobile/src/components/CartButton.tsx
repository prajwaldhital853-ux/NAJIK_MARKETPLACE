import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { openListing } from "../navigation/browse";
import { shadow } from "../theme";
import { ClassifiedGridCard, LISTING_CARD_W } from "./ClassifiedCard";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";
const GAP = 11;

export function CartButton() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { items, count, remove } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const unsub = navigation.addListener("state", () => setOpen(false));
    return unsub;
  }, [navigation, open]);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10}>
        <Ionicons name="cart-outline" size={22} color="#111827" />
        {count > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -5,
              right: -7,
              backgroundColor: "#F85606",
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 3,
              borderWidth: 1.5,
              borderColor: "#fff",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{count > 99 ? "99+" : count}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
            <Text style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: 17, color: "#111827" }}>
              Cart {count ? `(${count})` : ""}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {items.length ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
                {items.map((entry) => (
                  <View key={entry.id} style={{ width: LISTING_CARD_W }}>
                    <ClassifiedGridCard item={entry.item} width={LISTING_CARD_W} />
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <PressScale
                        onPress={() => {
                          setOpen(false);
                          openListing(navigation, entry.id);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: GREEN,
                          borderRadius: 8,
                          paddingVertical: 8,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>View</Text>
                      </PressScale>
                      <PressScale
                        onPress={() => remove(entry.id)}
                        style={{
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#6B7280" />
                      </PressScale>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Ionicons name="cart-outline" size={34} color="#9CA3AF" />
              </View>
              <Text style={{ fontWeight: "800", fontSize: 16, color: "#111827" }}>Your cart is empty</Text>
              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Tap Add to Cart on any listing to save it here.
              </Text>
              <PressScale
                onPress={() => setOpen(false)}
                style={{
                  marginTop: 18,
                  backgroundColor: GREEN,
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  borderRadius: 10,
                  ...shadow.card,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Browse listings</Text>
              </PressScale>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
