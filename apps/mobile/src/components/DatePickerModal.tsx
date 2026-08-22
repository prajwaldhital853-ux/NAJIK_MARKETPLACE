import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  adToBs,
  bsToAd,
  clampYmd,
  daysFor,
  formatAd,
  formatBs,
  monthNames,
  shiftMonth,
  todayAd,
  type CalendarMode,
  type Ymd,
  yearRange,
} from "../nepaliDate";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Booking flows — Gregorian Date */
  onSelect?: (date: Date) => void;
  initialDate?: Date;
  /** Provider registration — stored AD Ymd */
  onPick?: (ad: Ymd) => void;
  valueAd?: Ymd | null;
  title?: string;
  modes?: CalendarMode[];
};

function fromDate(d: Date): Ymd {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
  onPick,
  valueAd,
  title,
  modes = ["AD", "BS"],
}: Props) {
  const insets = useSafeAreaInsets();
  const allowedModes = modes.length ? modes : ["AD", "BS"];
  const [mode, setMode] = useState<CalendarMode>(allowedModes[0]);

  const seedAd = useMemo(() => {
    if (valueAd) return clampYmd("AD", valueAd);
    if (initialDate) return fromDate(initialDate);
    return todayAd();
  }, [valueAd, initialDate]);

  const [selectedAd, setSelectedAd] = useState<Ymd>(seedAd);

  useEffect(() => {
    if (!visible) return;
    setSelectedAd(seedAd);
    setMode(allowedModes[0]);
  }, [visible, seedAd, allowedModes]);

  const display =
    mode === "BS" ? adToBs(selectedAd) : selectedAd;
  const { min, max } = yearRange(mode);
  const years = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const monthList = monthNames(mode);
  const dayCount = daysFor(mode, display.year, display.month);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  function shiftDisplay(delta: number) {
    const next = shiftMonth(mode, display, delta);
    if (mode === "BS") {
      setSelectedAd(clampYmd("AD", bsToAd(next)));
    } else {
      setSelectedAd(next);
    }
  }

  function setFromModePick(year: number, month: number, day: number) {
    if (mode === "BS") {
      const ad = bsToAd(clampYmd("BS", { year, month, day }));
      setSelectedAd(clampYmd("AD", ad));
    } else {
      setSelectedAd(clampYmd("AD", { year, month, day }));
    }
  }

  function confirm() {
    if (onPick) onPick(selectedAd);
    if (onSelect) onSelect(new Date(selectedAd.year, selectedAd.month - 1, selectedAd.day));
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
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 18 }}>{title || "Select date"}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
          </View>

          <Text style={{ paddingHorizontal: 16, color: "#6B7280", fontSize: 12, marginBottom: 12 }}>
            {formatAd(selectedAd)} · {formatBs(adToBs(selectedAd))}
          </Text>

          {allowedModes.length > 1 ? (
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
              {allowedModes.map((m) => (
                <PressScale
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: mode === m ? GREEN : "#F3F4F6",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "800", fontSize: 13, color: mode === m ? "#fff" : "#6B7280" }}>
                    {m === "BS" ? "BS (Nepali)" : "AD (English)"}
                  </Text>
                </PressScale>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 }}>
            <PressScale onPress={() => shiftDisplay(-1)} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </PressScale>
            <Text style={{ fontWeight: "800", fontSize: 15 }}>
              {monthList[display.month - 1]} {display.year}
            </Text>
            <PressScale onPress={() => shiftDisplay(1)} style={{ padding: 8 }}>
              <Ionicons name="chevron-forward" size={22} color="#111827" />
            </PressScale>
          </View>

          <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, height: 168 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 11, color: "#6B7280", marginBottom: 6, textAlign: "center" }}>Year</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <PressScale
                    key={year}
                    onPress={() => setFromModePick(year, display.month, display.day)}
                    style={{
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: display.year === year ? GREEN : "transparent",
                      marginBottom: 2,
                    }}
                  >
                    <Text style={{ fontWeight: "700", fontSize: 14, color: display.year === year ? "#fff" : "#111827", textAlign: "center" }}>
                      {year}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={{ fontWeight: "700", fontSize: 11, color: "#6B7280", marginBottom: 6, textAlign: "center" }}>Month</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {monthList.map((name, idx) => (
                  <PressScale
                    key={name}
                    onPress={() => setFromModePick(display.year, idx + 1, display.day)}
                    style={{
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: display.month === idx + 1 ? GREEN : "transparent",
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 13,
                        color: display.month === idx + 1 ? "#fff" : "#111827",
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 11, color: "#6B7280", marginBottom: 6, textAlign: "center" }}>Day</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {days.map((day) => (
                  <PressScale
                    key={day}
                    onPress={() => setFromModePick(display.year, display.month, day)}
                    style={{
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: display.day === day ? GREEN : "transparent",
                      marginBottom: 2,
                    }}
                  >
                    <Text style={{ fontWeight: "700", fontSize: 14, color: display.day === day ? "#fff" : "#111827", textAlign: "center" }}>
                      {day}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>
          </View>

          <PressScale
            onPress={confirm}
            style={{
              marginHorizontal: 16,
              marginTop: 14,
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
