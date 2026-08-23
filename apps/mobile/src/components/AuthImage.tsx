import { Image, type ImageContentFit } from "expo-image";
import { useEffect, useState } from "react";
import { View, type StyleProp, type ImageStyle } from "react-native";
import { optionalAppAccessToken } from "../authApi";

export function AuthImage({
  uri,
  style,
  resizeMode = "cover",
  priority,
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageContentFit;
  priority?: "low" | "normal" | "high";
}) {
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);
  const needsAuth = Boolean(uri && uri.includes("/api/"));

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setHeaders(undefined);
      return;
    }
    if (!needsAuth) {
      setHeaders({});
      return;
    }
    void optionalAppAccessToken().then((token) => {
      if (!cancelled) setHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    });
    return () => {
      cancelled = true;
    };
  }, [uri, needsAuth]);

  if (!uri) return null;
  if (needsAuth && headers === undefined) {
    return <View style={[style, { backgroundColor: "#E8EEF0" }]} />;
  }

  return (
    <Image
      source={{ uri, headers: needsAuth ? headers : undefined }}
      style={style}
      contentFit={resizeMode}
      cachePolicy="memory-disk"
      transition={120}
      priority={priority}
      recyclingKey={uri}
    />
  );
}
