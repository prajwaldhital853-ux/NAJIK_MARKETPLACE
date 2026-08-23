import { Image, type ImageContentFit, type ImageProps } from "expo-image";
import { View, type StyleProp, type ImageStyle } from "react-native";

type Source = ImageProps["source"];

export function AppImage({
  source,
  uri,
  style,
  contentFit = "cover",
  priority,
  recyclingKey,
}: {
  source?: Source;
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  priority?: ImageProps["priority"];
  recyclingKey?: string;
}) {
  const resolved = source || (uri ? { uri } : null);
  if (!resolved) {
    return <View style={[style, { backgroundColor: "#E8EEF0" }]} />;
  }
  const key = recyclingKey || (typeof resolved === "object" && resolved && "uri" in resolved ? String(resolved.uri) : undefined);
  return (
    <Image
      source={resolved}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={120}
      priority={priority}
      recyclingKey={key}
    />
  );
}
