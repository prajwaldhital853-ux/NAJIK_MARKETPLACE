import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Image, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { fetchHomeBanners, type HomeBannerAudience } from "../homeBannerApi";
import { shadow } from "../theme";

const BANNER_HEIGHT = 156;
const POLL_MS = 45_000;
const AUTO_SCROLL_MS = 4000;

export function HomeBannerCarousel({ audience }: { audience: HomeBannerAudience }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  const width = Dimensions.get("window").width - 32;

  const load = useCallback(() => {
    void fetchHomeBanners(audience)
      .then((rows) => setUrls(rows.map((row) => row.image_url).filter(Boolean) as string[]))
      .catch(() => setUrls([]));
  }, [audience]);

  useFocusEffect(
    useCallback(() => {
      load();
      const poll = setInterval(load, POLL_MS);
      return () => clearInterval(poll);
    }, [load]),
  );

  useEffect(() => {
    if (urls.length < 2) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % urls.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_MS);
    return () => clearInterval(timer);
  }, [urls.length]);

  function onMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / width);
    if (Number.isFinite(next)) setIndex(next);
  }

  if (!urls.length) return null;

  return (
    <View style={{ marginBottom: 14, height: BANNER_HEIGHT, borderRadius: 18, overflow: "hidden", ...shadow.card }}>
      <FlatList
        ref={listRef}
        data={urls}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height: BANNER_HEIGHT }} resizeMode="cover" />
        )}
      />
      {urls.length > 1 ? (
        <View
          style={{
            position: "absolute",
            bottom: 8,
            alignSelf: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          {urls.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
