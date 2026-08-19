import { useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { OSM_MAP_HTML } from "./mapHtml";
import type { GeoPoint } from "../geo";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  category?: string;
  kind?: "price" | "category";
};

type Props = {
  mode?: "browse" | "pick";
  center: GeoPoint;
  zoom?: number;
  user?: GeoPoint | null;
  pin?: GeoPoint | null;
  selectedId?: string;
  markers?: MapMarker[];
  onSelect?: (id: string) => void;
  onPin?: (point: GeoPoint) => void;
  onBounds?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number; lat: number; lng: number; zoom: number }) => void;
};

export function OsmWebMap({ mode = "browse", center, zoom = 13, user, pin, selectedId, markers = [], onSelect, onPin, onBounds }: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);

  function push() {
    const payload = JSON.stringify({ mode, center, zoom, user, pin, selectedId, markers });
    ref.current?.postMessage(payload);
    ref.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(payload)}}));true;`);
  }

  useEffect(() => {
    if (ready.current) push();
  }, [mode, center.lat, center.lng, zoom, user?.lat, user?.lng, pin?.lat, pin?.lng, selectedId, JSON.stringify(markers)]);

  return (
    <View style={{ flex: 1, backgroundColor: "#E8EEF3" }}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html: OSM_MAP_HTML }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "ready") {
              ready.current = true;
              push();
            }
            if (msg.type === "select" && msg.id) onSelect?.(String(msg.id));
            if (msg.type === "pin") onPin?.({ lat: Number(msg.lat), lng: Number(msg.lng) });
            if (msg.type === "bounds") onBounds?.(msg);
          } catch {
            return;
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </View>
  );
}
