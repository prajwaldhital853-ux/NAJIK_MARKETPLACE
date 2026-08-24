import { Image } from "expo-image";
import { View } from "react-native";
import type { DrawerIconKey } from "../data/categoryIcons";
import { categoryIconSources } from "../data/categoryIcons";

type Props = {
  iconKey: DrawerIconKey;
  size?: number;
  imageSize?: number;
};

export function CategoryIconBubble({ iconKey, size = 36, imageSize }: Props) {
  const inner = imageSize ?? Math.round(size * 0.72);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#ECEEF1",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Image source={categoryIconSources[iconKey]} style={{ width: inner, height: inner }} contentFit="contain" />
    </View>
  );
}
