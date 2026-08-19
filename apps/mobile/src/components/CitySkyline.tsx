import { Dimensions, Image } from "react-native";
import Svg, { Path, Polygon, Rect } from "react-native-svg";

const skyline = require("../../assets/login-skyline.png");

type Props = { height?: number };

export function CitySkyline({ height = 138 }: Props) {
  const width = Dimensions.get("window").width;
  return <Image source={skyline} style={{ width, height }} resizeMode="cover" />;
}

export function HouseTreesMark({ size = 44 }: { size?: number }) {
  const height = Math.round(size * (64 / 88));
  return (
    <Svg width={size} height={height} viewBox="0 0 88 64">
      <Path d="M4 46 L12 32 L18 40 L26 28 L34 42 L42 30 L52 44 L60 34 L70 46 L80 36 L88 46 V56 H4 Z" fill="#C9E9D4" />
      <Path d="M18 42 L22 36 L26 42 Z" fill="#A8D4B8" />
      <Path d="M48 40 L54 30 L60 40 Z" fill="#B7DCC4" />
      <Path d="M10 22 C12 20 16 22 14 26 C18 26 16 30 12 28 C8 30 6 24 10 22 Z" fill="#8A8F98" />
      <Path d="M62 16 C64 14 68 16 66 20 C70 20 68 24 64 22 C60 24 58 18 62 16 Z" fill="#8A8F98" />
      <Polygon points="8,56 20,34 32,56" fill="#7EBF9B" />
      <Polygon points="58,56 72,30 86,56" fill="#8FCBAA" />
      <Polygon points="28,56 44,22 60,56" fill="#5AAE78" />
      <Path d="M34 34 L50 18 L66 34 Z" fill="#167A38" />
      <Rect x="38" y="34" width="24" height="22" fill="#F7FBF8" stroke="#D7E3DC" strokeWidth="1" />
      <Rect x="47" y="42" width="6" height="14" fill="#8B5A2B" />
      <Rect x="41" y="38" width="5" height="5" fill="#C9E9D4" />
      <Rect x="54" y="38" width="5" height="5" fill="#C9E9D4" />
    </Svg>
  );
}
