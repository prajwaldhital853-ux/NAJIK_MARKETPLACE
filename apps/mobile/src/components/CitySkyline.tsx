import { Dimensions, Image } from "react-native";
import Svg, { Path, Polygon, Rect } from "react-native-svg";

const skyline = require("../../assets/login-skyline.png");

type Props = { height?: number };

export function CitySkyline({ height = 138 }: Props) {
  const width = Dimensions.get("window").width;
  return <Image source={skyline} style={{ width, height }} resizeMode="cover" />;
}

export function HouseTreesMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Polygon points="6,40 14,22 22,40" fill="#7EBF9B" />
      <Polygon points="28,40 38,18 48,40" fill="#8FCBAA" />
      <Path d="M14 28 L24 16 L34 28 Z" fill="#1F9D4A" />
      <Rect x="18" y="28" width="12" height="12" fill="#167A38" />
      <Rect x="22" y="32" width="4" height="8" fill="#F7FBF8" />
    </Svg>
  );
}
