import { useEffect, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { optionalAppAccessToken } from "../authApi";

export function AuthImage({
  uri,
  style,
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
}) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!uri) {
      setSrc(null);
      return;
    }
    if (!uri.includes("/api/")) {
      setSrc(uri);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await optionalAppAccessToken();
        const response = await fetch(uri, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          if (!cancelled) setSrc(null);
          return;
        }
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) setSrc(typeof reader.result === "string" ? reader.result : null);
        };
        reader.readAsDataURL(blob);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!uri || !src) return null;
  return <Image source={{ uri: src }} style={style} />;
}
