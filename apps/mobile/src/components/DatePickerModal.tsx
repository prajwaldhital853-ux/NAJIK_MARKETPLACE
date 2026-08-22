import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";

type CalendarSystem = "AD" | "BS";

const BS_MONTHS = [
  "Baishakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

const AD_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  const offset = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const adYear = bsYear - 57;
  const adMonth = (bsMonth + 8) % 12;
  const adDay = bsDay + 17;
  const daysInMonth = adMonth === 1 ? (adYear % 4 === 0 && (adYear % 100 !== 0 || adYear % 400 === 0) ? 29 : 28) : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][adMonth];
  
  if (adDay > daysInMonth) {
    return new Date(adYear, (adMonth + 1) % 12, adDay - daysInMonth);
  }
  return new Date(adYear, adMonth, adDay);
}

function adToBs(date: Date): { year: number; month: number; day: number } {
  const adYear = date.getFullYear();
  const adMonth = date.getMonth();
  const adDay = date.getDate();
  
  const bsYear = adYear + 57;
  const bsMonth = (adMonth + 4) % 12;
  const bsDay = adDay - 17;
  
  if (bsDay < 1) {
    return { year: bsYear, month: (bsMonth - 1 + 12) % 12, day: bsDay + 30 };
  }
  return { year: bsYear, month: bsMonth, day: bsDay };
}

export function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
}) {
  const insets = useSafeAreaInsets();
  const today = initialDate || new Date();
  const [calendarSystem, setCalendarSystem] = useState<CalendarSystem>("AD");
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const bs = calendarSystem === "BS" ? adToBs(new Date(selectedYear, selectedMonth, selectedDay)) : null;
  const displayYear = calendarSystem === "BS" && bs ? bs.year : selectedYear;
  const displayMonth = calendarSystem === "BS" && bs ? bs.month : selectedMonth;
  const displayDay = calendarSystem === "BS" && bs ? bs.day : selectedDay;

  const monthNames = calendarSystem === "BS" ? BS_MONTHS : AD_MONTHS;
  const daysInMonth = calendarSystem === "BS" ? 30 : new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const years = Array.from({ length: 20 }, (_, i) => (calendarSystem === "BS" ? 2078 : 2021) + i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function handleSelect() {
    if (calendarSystem === "BS" && bs) {
      const adDate = bsToAd(bs.year, bs.month, bs.day);
      onSelect(adDate);
    } else {
      onSelect(new Date(selectedYear, selectedMonth, selectedDay));
    }
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
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 18 }}>Select Date</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
            <PressScale
              onPress={() => setCalendarSystem("AD")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: calendarSystem === "AD" ? GREEN : "#F3F4F6",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 13, color: calendarSystem === "AD" ? "#fff" : "#6B7280" }}>AD</Text>
            </PressScale>
            <PressScale
              onPress={() => setCalendarSystem("BS")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: calendarSystem === "BS" ? GREEN : "#F3F4F6",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 13, color: calendarSystem === "BS" ? "#fff" : "#6B7280" }}>BS (Bikram Sambat)</Text>
            </PressScale>
          </View>

          <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, height: 160 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 8, textAlign: "center" }}>Year</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <PressScale
                    key={year}
                    onPress={() => {
                      if (calendarSystem === "BS" && bs) {
                        const ad = bsToAd(year, displayMonth, Math.min(displayDay, 30));
                        setSelectedYear(ad.getFullYear());
                        setSelectedMonth(ad.getMonth());
                        setSelectedDay(ad.getDate());
                      } else {
                        setSelectedYear(year);
                      }
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: displayYear === year ? GREEN : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 14,
                        color: displayYear === year ? "#fff" : "#111827",
                        textAlign: "center",
                      }}
                    >
                      {year}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>

            <View style={{ flex: 1.5 }}>
              <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 8, textAlign: "center" }}>Month</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {monthNames.map((month, idx) => (
                  <PressScale
                    key={month}
                    onPress={() => {
                      if (calendarSystem === "BS" && bs) {
                        const ad = bsToAd(displayYear, idx, Math.min(displayDay, 30));
                        setSelectedYear(ad.getFullYear());
                        setSelectedMonth(ad.getMonth());
                        setSelectedDay(ad.getDate());
                      } else {
                        setSelectedMonth(idx);
                      }
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: displayMonth === idx ? GREEN : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 14,
                        color: displayMonth === idx ? "#fff" : "#111827",
                        textAlign: "center",
                      }}
                    >
                      {month}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 12, color: "#6B7280", marginBottom: 8, textAlign: "center" }}>Day</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {days.map((day) => (
                  <PressScale
                    key={day}
                    onPress={() => {
                      if (calendarSystem === "BS" && bs) {
                        const ad = bsToAd(displayYear, displayMonth, day);
                        setSelectedYear(ad.getFullYear());
                        setSelectedMonth(ad.getMonth());
                        setSelectedDay(ad.getDate());
                      } else {
                        setSelectedDay(day);
                      }
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: displayDay === day ? GREEN : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 14,
                        color: displayDay === day ? "#fff" : "#111827",
                        textAlign: "center",
                      }}
                    >
                      {day}
                    </Text>
                  </PressScale>
                ))}
              </ScrollView>
            </View>
          </View>

          <PressScale
            onPress={handleSelect}
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
