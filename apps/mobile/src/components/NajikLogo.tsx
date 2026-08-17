import { Image, Text, View } from "react-native";
import { colors } from "../theme";

const logo = require("../../assets/logo.png");

type Props = {
  size?: "sm" | "md" | "lg" | "hero" | "welcome";
  showWordmark?: boolean;
  showTagline?: boolean;
  layout?: "row" | "stack";
  taglineStyle?: "brand" | "welcome";
};

const widths = { sm: 34, md: 56, lg: 88, hero: 124, welcome: 108 };

export function NajikLogo({
  size = "md",
  showWordmark = true,
  showTagline,
  layout,
  taglineStyle = "brand",
}: Props) {
  const row = layout ? layout === "row" : size === "sm";
  const width = widths[size];
  const height = Math.round(width * (550 / 653));
  const tagline = showTagline ?? (!row && size !== "sm");
  const wordmarkSize = size === "welcome" || size === "hero" ? 34 : size === "lg" ? 28 : size === "sm" ? 17 : 22;

  return (
    <View style={{ alignItems: "center", flexDirection: row ? "row" : "column", gap: row ? 8 : size === "welcome" ? 4 : 2 }}>
      <Image source={logo} style={{ width, height }} resizeMode="contain" />
      {showWordmark ? (
        <View style={{ alignItems: row ? "flex-start" : "center" }}>
          <Text
            style={{
              fontSize: wordmarkSize,
              fontWeight: "800",
              letterSpacing: size === "welcome" ? 1.4 : 0.6,
              color: colors.navy,
              lineHeight: size === "sm" ? 20 : undefined,
            }}
          >
            NAJIK
          </Text>
          {tagline ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: size === "welcome" ? 4 : 2 }}>
              {size !== "sm" ? (
                <View style={{ width: size === "hero" || size === "welcome" ? 32 : 22, height: 1.5, backgroundColor: colors.green }} />
              ) : null}
              {taglineStyle === "welcome" ? (
                <Text style={{ fontSize: 10, letterSpacing: 1.6, fontWeight: "700", color: colors.green }}>EVERYTHING NEAR YOU</Text>
              ) : (
                <Text style={{ fontSize: size === "hero" || size === "welcome" ? 10 : 8, letterSpacing: size === "hero" || size === "welcome" ? 1.6 : 1.4, fontWeight: "700" }}>
                  <Text style={{ color: colors.navy }}>EVERYTHING </Text>
                  <Text style={{ color: colors.green }}>NEAR</Text>
                  <Text style={{ color: colors.navy }}> YOU</Text>
                </Text>
              )}
              {size !== "sm" ? (
                <View style={{ width: size === "hero" || size === "welcome" ? 32 : 22, height: 1.5, backgroundColor: colors.green }} />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
