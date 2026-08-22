import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";

export function TimePickerModal({
  visible,
  onClose,
  onSelect,
  initialHour = 12,
  initialMinute = 0,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
}) {
  const insets = useSafeAreaInsets();
  const [hour, setHour] = useState(initialHour > 12 ? initialHour - 12 : initialHour === 0 ? 12 : initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [period, setPeriod] = useState<"AM" | "PM">(initialHour >= 12 ? "PM" : "AM");

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  function handleConfirm() {
    let finalHour = hour;
    if (period === "PM" && hour !== 12) {
      finalHour = hour + 12;
    } else if (period === "AM" && hour === 12) {
      finalHour = 0;
    }
    onSelect(finalHour, minute);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 18 }}>Select Time</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
          </View>

          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 24,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 48, fontWeight: "800", color: GREEN, letterSpacing: 2 }}>
              {hour.toString().padStart(2, "0")}:{minute.toString().padStart(2, "0")} {period}
            </Text>
          </View>

          <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, height: 180 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 8, textAlign: "center" }}>Hour</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {hours.map((h) => (
                  <PressScale
                    key={h}
                    onPress={() => setHour(h)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: hour === h ? GREEN : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 16,
                        color: hour === h ? "#fff" : "#111827",
                        textAlign: "center",
                      }}
                    >
                      {h.toString().padStart(2, "0")}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 8, textAlign: "center" }}>Minute</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {minutes.map((m) => (
                  <PressScale
                    key={m}
                    onPress={() => setMinute(m)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: minute === m ? GREEN : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 16,
                        color: minute === m ? "#fff" : "#111827",
                        textAlign: "center",
                      }}
                    >
                      {m.toString().padStart(2, "0")}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 8, textAlign: "center" }}>Period</Text>
              <View style={{ gap: 8 }}>
                <PressScale
                  onPress={() => setPeriod("AM")}
                  style={{
                    paddingVertical: 20,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: period === "AM" ? GREEN : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      fontSize: 16,
                      color: period === "AM" ? "#fff" : "#111827",
                      textAlign: "center",
                    }}
                  >
                    AM
                  </Text>
                </PressScale>
                <PressScale
                  onPress={() => setPeriod("PM")}
                  style={{
                    paddingVertical: 20,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: period === "PM" ? GREEN : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      fontSize: 16,
                      color: period === "PM" ? "#fff" : "#111827",
                      textAlign: "center",
                    }}
                  >
                    PM
                  </Text>
                </PressScale>
              </View>
            </View>
          </View>

          <PressScale
            onPress={handleConfirm}
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: GREEN,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Confirm</Text>
          </PressScale>
        </View>
      </View>
    </Modal>
  );
}
