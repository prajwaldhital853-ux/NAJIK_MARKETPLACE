import { Image, Text, View } from "react-native";

const mark = require("../../assets/logo.png");
const wordmark = require("../../assets/najik-wordmark.png");

const INK = "#1A1A1A";
const GREEN = "#22A84A";

export function NajikWordmark({ scale = 1, showMark = true }: { scale?: number; showMark?: boolean }) {
  const markW = Math.round(88 * scale);
  const markH = Math.round(markW * (550 / 653));
  const wordW = Math.round(210 * scale);
  const fullH = Math.round(wordW * (250 / 996));
  const cropH = Math.round(fullH * 0.7);

  return (
    <View style={{ alignItems: "center" }}>
      {showMark ? (
        <Image source={mark} style={{ width: markW, height: markH, marginBottom: 4 }} resizeMode="contain" />
      ) : null}
      <View style={{ width: wordW, height: cropH, overflow: "hidden" }}>
        <Image source={wordmark} style={{ width: wordW, height: fullH }} resizeMode="contain" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
        <View style={{ width: 28 * scale, height: 1.5, backgroundColor: GREEN }} />
        <Text style={{ fontSize: 10 * scale, fontWeight: "700", letterSpacing: 1.4 }}>
          <Text style={{ color: INK }}>EVERYTHING </Text>
          <Text style={{ color: GREEN }}>NEAR</Text>
          <Text style={{ color: INK }}> YOU</Text>
        </Text>
        <View style={{ width: 28 * scale, height: 1.5, backgroundColor: GREEN }} />
      </View>
    </View>
  );
}
