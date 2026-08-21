import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  adToBs,
  bsToAd,
  clampYmd,
  daysFor,
  firstWeekday,
  formatAd,
  formatBs,
  monthNames,
  shiftMonth,
  todayAd,
  type CalendarMode,
  type Ymd,
  yearRange,
} from "../nepaliDate";
import { colors } from "../theme";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DatePickerModal({
  visible,
  title,
  valueAd,
  modes = ["AD", "BS"],
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  valueAd?: Ymd | null;
  modes?: CalendarMode[];
  onClose: () => void;
  onPick: (ad: Ymd) => void;
}) {
  const insets = useSafeAreaInsets();
  const initial = valueAd || todayAd();
  const [mode, setMode] = useState<CalendarMode>(modes[0] || "AD");
  const [cursor, setCursor] = useState<Ymd>(initial);
  const [selected, setSelected] = useState<Ymd>(initial);
  const [yearOpen, setYearOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const startMode = modes[0] || "AD";
    const start = startMode === "BS" ? adToBs(initial) : initial;
    setMode(startMode);
    setCursor(start);
    setSelected(start);
    setYearOpen(false);
  }, [visible]);

  function switchMode(next: CalendarMode) {
    if (next === mode) return;
    const asAd = mode === "AD" ? selected : bsToAd(selected);
    const converted = next === "AD" ? asAd : adToBs(asAd);
    setMode(next);
    setSelected(clampYmd(next, converted));
    setCursor(clampYmd(next, converted));
    setYearOpen(false);
  }

  function confirm() {
    const ad = mode === "AD" ? clampYmd("AD", selected) : bsToAd(clampYmd("BS", selected));
    onPick(ad);
    onClose();
  }

  function pickYear(year: number) {
    const next = clampYmd(mode, { ...cursor, year });
    setCursor(next);
    setSelected((prev) => clampYmd(mode, { ...prev, year, month: next.month }));
    setYearOpen(false);
  }

  const dayCount = daysFor(mode, cursor.year, cursor.month);
  const startPad = firstWeekday(mode, cursor.year, cursor.month);
  const cells = useMemo(() => {
    const list: Array<number | null> = [];
    for (let i = 0; i < startPad; i++) list.push(null);
    for (let d = 1; d <= dayCount; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [dayCount, startPad]);

  const years = useMemo(() => {
    const { min, max } = yearRange(mode);
    const list: number[] = [];
    for (let y = max; y >= min; y--) list.push(y);
    return list;
  }, [mode]);

  const monthLabel = monthNames(mode)[cursor.month - 1];
  const previewAd = mode === "AD" ? selected : bsToAd(selected);
  const previewBs = mode === "BS" ? selected : adToBs(selected);
  const range = yearRange(mode);
  const canPrev = cursor.year > range.min || cursor.month > 1;
  const canNext = cursor.year < range.max || cursor.month < 12;
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            maxHeight: "90%",
            paddingTop: 16,
            paddingHorizontal: 16,
            paddingBottom: bottomPad,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.text }}>{title}</Text>
            <PressScale onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </PressScale>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {modes.length > 1 ? (
              <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, marginBottom: 12 }}>
                {modes.map((item) => {
                  const on = item === mode;
                  return (
                    <PressScale
                      key={item}
                      onPress={() => switchMode(item)}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: on ? GREEN : "transparent",
                      }}
                    >
                      <Text style={{ fontWeight: "800", color: on ? "#fff" : colors.text }}>{item}</Text>
                    </PressScale>
                  );
                })}
              </View>
            ) : (
              <View style={{ alignSelf: "flex-start", backgroundColor: "#E8F7EC", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 }}>
                <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{mode} calendar</Text>
              </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <PressScale
                onPress={() => {
                  setYearOpen(false);
                  if (canPrev) setCursor((c) => shiftMonth(mode, c, -1));
                }}
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", opacity: canPrev ? 1 : 0.35 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </PressScale>

              <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <Text style={{ fontWeight: "800", fontSize: 16, color: colors.text }}>{monthLabel}</Text>
                <PressScale
                  onPress={() => setYearOpen((v) => !v)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: yearOpen ? "#E8F7EC" : "#F3F4F6",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: yearOpen ? GREEN : "#E5E7EB",
                  }}
                >
                  <Text style={{ fontWeight: "800", color: GREEN }}>{cursor.year}</Text>
                  <Ionicons name={yearOpen ? "chevron-up" : "chevron-down"} size={14} color={GREEN} />
                </PressScale>
              </View>

              <PressScale
                onPress={() => {
                  setYearOpen(false);
                  if (canNext) setCursor((c) => shiftMonth(mode, c, 1));
                }}
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", opacity: canNext ? 1 : 0.35 }}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </PressScale>
            </View>

            {yearOpen ? (
              <View style={{ height: 200, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {years.map((year) => {
                    const on = year === cursor.year;
                    return (
                      <PressScale
                        key={year}
                        onPress={() => pickYear(year)}
                        style={{
                          height: 44,
                          paddingHorizontal: 16,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: on ? "#E8F7EC" : "#fff",
                          borderBottomWidth: 1,
                          borderBottomColor: "#F3F4F6",
                        }}
                      >
                        <Text style={{ fontWeight: on ? "800" : "600", color: on ? GREEN : colors.text, fontSize: 15 }}>{year}</Text>
                        {on ? <Ionicons name="checkmark" size={16} color={GREEN} /> : null}
                      </PressScale>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", marginBottom: 4 }}>
                  {WEEKDAYS.map((day) => (
                    <Text key={day} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.muted, paddingVertical: 6 }}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {cells.map((day, index) => {
                    if (day == null) {
                      return <View key={`empty-${index}`} style={{ width: "14.28%", height: 40 }} />;
                    }
                    const on = selected.year === cursor.year && selected.month === cursor.month && selected.day === day;
                    const today =
                      mode === "AD"
                        ? (() => {
                            const t = todayAd();
                            return t.year === cursor.year && t.month === cursor.month && t.day === day;
                          })()
                        : (() => {
                            const t = adToBs(todayAd());
                            return t.year === cursor.year && t.month === cursor.month && t.day === day;
                          })();
                    return (
                      <PressScale
                        key={`d-${day}`}
                        onPress={() => setSelected({ year: cursor.year, month: cursor.month, day })}
                        style={{ width: "14.28%", height: 40, alignItems: "center", justifyContent: "center" }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: on ? GREEN : today ? "#E8F7EC" : "transparent",
                            borderWidth: today && !on ? 1 : 0,
                            borderColor: GREEN,
                          }}
                        >
                          <Text style={{ fontWeight: on || today ? "800" : "600", color: on ? "#fff" : colors.text }}>{day}</Text>
                        </View>
                      </PressScale>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
              {formatAd(previewAd)} (AD) · {formatBs(previewBs)} (BS)
            </Text>
          </ScrollView>

          <PressScale
            onPress={confirm}
            style={{
              marginTop: 10,
              height: 48,
              borderRadius: 12,
              backgroundColor: GREEN,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Confirm date</Text>
          </PressScale>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
