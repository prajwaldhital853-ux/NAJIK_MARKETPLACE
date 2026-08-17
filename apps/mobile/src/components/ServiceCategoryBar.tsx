import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Text, View } from "react-native";

const INK = "#1A1A1A";
const GREEN = "#22A84A";
const SIZE = 36;

const items = [
  { key: "PROPERTY", Icon: PropertyIcon },
  { key: "VEHICLES", Icon: VehiclesIcon },
  { key: "JOBS", Icon: JobsIcon },
  { key: "SERVICES", Icon: ServicesIcon },
  { key: "MARKETPLACE", Icon: MarketplaceIcon },
  { key: "BUSINESS", Icon: BusinessIcon },
  { key: "NEARBY", Icon: NearbyIcon },
];

export function ServiceCategoryBar() {
  return (
    <View style={{ flexDirection: "row", width: "100%", alignItems: "stretch", paddingHorizontal: 2 }}>
      {items.map((item, index) => (
        <View key={item.key} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {index > 0 ? <View style={{ width: 1, height: 48, backgroundColor: "#E6E8EC" }} /> : null}
          <View style={{ flex: 1, alignItems: "center", paddingVertical: 2 }}>
            {item.key === "SERVICES" ? <View style={{ transform: [{ scale: 1.12 }] }}><item.Icon /></View> : <item.Icon />}
            <Text
              style={{ fontSize: 7, fontWeight: "800", marginTop: 6, color: INK, letterSpacing: 0.15 }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {item.key}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function PropertyIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 32 32" fill="none">
      <Path d="M3 14.2 L16 3.2 L29 14.2 V15.6 H3 Z" fill={GREEN} />
      <Path d="M6.4 15.2 V28.2 H25.6 V15.2" stroke={INK} strokeWidth="1.8" />
      <Rect x="13.2" y="19.2" width="5.6" height="9" fill={GREEN} />
      <Rect x="8" y="18.4" width="3.2" height="3.2" stroke={INK} strokeWidth="1.2" />
      <Rect x="20.8" y="18.4" width="3.2" height="3.2" stroke={INK} strokeWidth="1.2" />
    </Svg>
  );
}

function VehiclesIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 32 32" fill="none">
      <Path d="M8 13.4 L11.6 6.2 H20.4 L24 13.4 Z" fill={GREEN} />
      <Path d="M4.6 13.6 H27.4 L29.2 20.8 H2.8 Z" stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
      <Path d="M3.2 20.6 H28.8 V23.6 C28.8 24.5 28 25.2 27.1 25.2 H4.9 C4 25.2 3.2 24.5 3.2 23.6 Z" fill={INK} />
      <Circle cx="8.8" cy="26.8" r="2.05" fill={INK} />
      <Circle cx="23.2" cy="26.8" r="2.05" fill={INK} />
      <Circle cx="10.4" cy="17" r="1.2" fill={INK} />
      <Circle cx="21.6" cy="17" r="1.2" fill={INK} />
    </Svg>
  );
}

function JobsIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 32 32" fill="none">
      <Path d="M9.4 11.2 V8.4 C9.4 7.2 10.4 6.2 11.6 6.2 H20.4 C21.6 6.2 22.6 7.2 22.6 8.4 V11.2" stroke={GREEN} strokeWidth="2" />
      <Path d="M4.6 11.2 H27.4 V15.6 H4.6 Z" fill={GREEN} />
      <Path d="M4.6 15.4 V26.4 C4.6 27.4 5.4 28.2 6.4 28.2 H25.6 C26.6 28.2 27.4 27.4 27.4 26.4 V15.4" stroke={INK} strokeWidth="1.8" />
      <Circle cx="16" cy="20.6" r="1.7" fill={GREEN} />
    </Svg>
  );
}

function ServicesIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 32 32" fill="none">
      <Path d="M20.2 5.6 L26.2 11.6 L24.2 13.6 L18.2 7.6 Z" fill={GREEN} />
      <Path d="M19.2 8.6 L11.4 16.4" stroke={GREEN} strokeWidth="2.1" strokeLinecap="round" />
      <Path d="M7.6 19.2 L12.6 24.2 C13.6 25.2 15.2 25.2 16.2 24.2 L17.6 22.8 L10.2 15.4 Z" fill={GREEN} />
      <Path d="M8.4 8.2 C6.2 10.4 6.2 13.8 8.4 16" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M8.4 8.2 L6.2 6 L8.6 4.8 L12.2 8.4 C10.8 7.2 9.4 7.2 8.4 8.2 Z" fill={GREEN} />
      <Path d="M12.6 12.2 L21.8 21.4" stroke={GREEN} strokeWidth="2.3" strokeLinecap="round" />
      <Path d="M21 20.6 L25.4 25 C26.2 25.8 26.2 27 25.4 27.8 L24 27.8 L19.6 23.4 Z" fill={GREEN} />
    </Svg>
  );
}

function MarketplaceIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 32 32" fill="none">
      <Path d="M5.4 7.2 H9.2 L11.4 20.6 H24.8 L26.8 11.2 H10.2" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M11.8 18.8 H24.2 L25.4 12.4 H10.8 Z" fill={GREEN} />
      <Path d="M9.2 7.2 C9.2 7.2 9.8 4.4 12.8 4.4" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="13.2" cy="25.6" r="1.7" fill={INK} />
      <Circle cx="23.4" cy="25.6" r="1.7" fill={INK} />
    </Svg>
  );
}

function BusinessIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 32 32" fill="none">
      <Path d="M5 13.4 H27 V28.4 H5 Z" stroke={INK} strokeWidth="1.8" />
      <Path d="M3.4 7 H28.6 V13.4 H3.4 Z" stroke={INK} strokeWidth="1.5" />
      <Path d="M4 7.2 L8 13.4 H4 Z" fill={GREEN} />
      <Path d="M8 7.2 L12 13.4 H8 Z" fill={INK} />
      <Path d="M12 7.2 L16 13.4 H12 Z" fill={GREEN} />
      <Path d="M16 7.2 L20 13.4 H16 Z" fill={INK} />
      <Path d="M20 7.2 L24 13.4 H20 Z" fill={GREEN} />
      <Path d="M24 7.2 L28.4 13.4 H24 Z" fill={INK} />
      <Rect x="13.6" y="19.8" width="4.8" height="8.6" fill={GREEN} />
      <Rect x="7.4" y="16.2" width="3.2" height="3.2" stroke={INK} strokeWidth="1.15" />
      <Rect x="21.4" y="16.2" width="3.2" height="3.2" stroke={INK} strokeWidth="1.15" />
    </Svg>
  );
}

function NearbyIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 29 C16 29 6.4 19.6 6.4 12.8 C6.4 7.6 10.4 4 16 4 C21.6 4 25.6 7.6 25.6 12.8 C25.6 19.6 16 29 16 29 Z"
        fill={GREEN}
        stroke={INK}
        strokeWidth="1.2"
      />
      <Circle cx="16" cy="12.8" r="3.6" fill="#fff" />
    </Svg>
  );
}
