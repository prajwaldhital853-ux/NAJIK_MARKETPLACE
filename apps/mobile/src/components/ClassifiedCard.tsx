import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { catalogMeta, listingBlurb, type CatalogItem } from "../data/catalog";
import { formatDistance } from "../geo";
import { openListing } from "../navigation/browse";
import { colors, shadow } from "../theme";
import { useSavedListings } from "../context/SavedListings";
import { PressScale } from "./PressScale";
import { AppImage } from "./AppImage";

const GREEN = "#1B7D2C";
const RED = "#DC2626";
const LINE = "#E8E8E8";
const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 11;
export const LISTING_CARD_W = (SCREEN_W - PAD * 2 - GAP) / 2;

export function classifiedMore(item: CatalogItem, onReport?: () => void) {
  Alert.alert(item.title, undefined, [
    { text: "Share", onPress: () => void Share.share({ message: `${item.title} · ${item.price}\n${item.location}` }) },
    {
      text: "Report ad",
      onPress: () => {
        if (onReport) onReport();
        else Alert.alert("Report", "Open the listing to report this ad.");
      },
    },
    { text: "Hide", style: "destructive" },
    { text: "Cancel", style: "cancel" },
  ]);
}

export function postedLabel(time: string) {
  const t = time.trim();
  if (/^posted\s/i.test(t)) return t;
  return `Posted ${t}`;
}

export function listingTags(item: CatalogItem) {
  const tags: string[] = [];
  if (item.badge === "BOOSTED" || item.badge === "FEATURED") tags.push("Boosted");
  if (item.badge === "VERIFIED") tags.push("Verified");
  item.tags.forEach((tag) => {
    if (tag !== "All" && !tags.includes(tag)) tags.push(tag);
  });
  return tags.slice(0, 3);
}

export function StarsCount({ rating, count, compact }: { rating: number; count: number; compact?: boolean }) {
  if (!count) return null;
  const filled = Math.max(0, Math.min(5, Math.round(rating || 0)));
  const size = compact ? 10 : 12;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name="star" size={size} color={n <= filled ? "#F5C518" : "#D1D5DB"} />
      ))}
      <Text style={{ color: "#6B7280", fontSize: compact ? 10 : 12, marginLeft: 2 }}>({count})</Text>
    </View>
  );
}

export function SalePrice({
  amount,
  unit,
  originalPrice,
  discountPercent,
  compact,
}: {
  amount: string;
  unit?: string;
  originalPrice?: string;
  discountPercent?: number;
  compact?: boolean;
}) {
  const sale = Boolean(discountPercent && originalPrice);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" }}>
        <Text style={{ fontWeight: "800", fontSize: compact ? 15 : 20, color: sale ? "#EA580C" : GREEN }}>{amount}</Text>
        {unit ? <Text style={{ color: "#8A8F98", fontSize: compact ? 10 : 13, marginLeft: 3 }}>{unit}</Text> : null}
      </View>
      {sale ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Text style={{ color: "#9CA3AF", fontSize: compact ? 11 : 13, textDecorationLine: "line-through" }}>{originalPrice}</Text>
          <Text style={{ color: "#9CA3AF", fontSize: compact ? 11 : 13 }}>-{discountPercent}%</Text>
        </View>
      ) : null}
    </View>
  );
}

export function splitPrice(price: string) {
  const cleaned = price.replace(/\s*\/mo\b/i, " /month");
  const idx = cleaned.search(/\s\//);
  if (idx > 0) return { amount: cleaned.slice(0, idx).trim(), unit: cleaned.slice(idx).trim() };
  return { amount: cleaned, unit: "" };
}

export function ConditionPill({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: "#E7F6EC", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 6, marginTop: 4 }}>
      <Text style={{ color: GREEN, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

export function BookmarkBtn({ id }: { id: string }) {
  const { has, toggle } = useSavedListings();
  const on = has(id);
  return (
    <Pressable onPress={() => toggle(id)} hitSlop={10}>
      <Ionicons name={on ? "bookmark" : "bookmark-outline"} size={20} color={on ? GREEN : "#6B7280"} />
    </Pressable>
  );
}

function HeartSave({ id }: { id: string }) {
  const { has, toggle } = useSavedListings();
  const on = has(id);
  return (
    <Pressable onPress={() => toggle(id)} hitSlop={8} style={{ padding: 4 }}>
      <Ionicons name={on ? "heart" : "heart-outline"} size={16} color={on ? colors.red : "#fff"} />
    </Pressable>
  );
}

function UrgentCountdownInline({ endsAt }: { endsAt: string }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const tick = () => setMs(Math.max(0, Date.parse(endsAt) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, minHeight: 16 }}>
      <Ionicons name="time-outline" size={11} color={RED} />
      <Text style={{ color: RED, fontSize: 10, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function categoryIcon(item: CatalogItem): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    home: "home-outline",
    car: "car-outline",
    briefcase: "briefcase-outline",
    construct: "construct-outline",
    storefront: "storefront-outline",
    "phone-portrait": "phone-portrait-outline",
    bed: "bed-outline",
    grid: "grid-outline",
  };
  return map[catalogMeta[item.key].icon] ?? "business-outline";
}

export function ClassifiedCard({ item }: { item: CatalogItem }) {
  return <ClassifiedGridCard item={item} width={LISTING_CARD_W} />;
}

export function ClassifiedGridCard({ item, width }: { item: CatalogItem; width: number }) {
  return <ListingAdCard item={item} width={width} photoH={Math.round(width * 0.68)} compact />;
}

export function UrgentListingCard({ item }: { item: CatalogItem }) {
  const width = Math.min(200, LISTING_CARD_W + 24);
  return (
    <View style={{ width }}>
      <ListingAdCard item={item} width={width} photoH={Math.round(width * 0.62)} compact urgent />
    </View>
  );
}

export function ListingGrid({ items }: { items: CatalogItem[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {items.map((item) => (
        <ClassifiedGridCard key={item.id} item={item} width={LISTING_CARD_W} />
      ))}
    </View>
  );
}

/** Horizontal marketplace rail (Hamro Bazar style). */
export function ListingRail({
  items,
  cardWidth = Math.min(168, LISTING_CARD_W),
  scrollRef,
  onScroll,
}: {
  items: CatalogItem[];
  cardWidth?: number;
  scrollRef?: RefObject<ScrollView | null>;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  if (!items.length) return null;
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ gap: 10, paddingRight: 4 }}
    >
      {items.map((item) => (
        <ClassifiedGridCard key={item.id} item={item} width={cardWidth} />
      ))}
    </ScrollView>
  );
}

export function ListingList({ items }: { items: CatalogItem[] }) {
  return (
    <View>
      {items.map((item) => (
        <ListingListRow key={item.id} item={item} />
      ))}
    </View>
  );
}

export function ListingListRow({ item }: { item: CatalogItem }) {
  const navigation = useNavigation<any>();
  return (
    <PressScale
      onPress={() => openListing(navigation, item.id)}
      style={{
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 10,
        flexDirection: "row",
        gap: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: LINE,
        ...shadow.card,
      }}
    >
      {item.photo ? <AppImage source={item.photo} style={{ width: 92, height: 92, borderRadius: 10, backgroundColor: "#E8EEF0" }} recyclingKey={item.id} /> : (
        <View style={{ width: 92, height: 92, borderRadius: 10, backgroundColor: "#E8EEF0" }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", color: colors.navy }} numberOfLines={2}>{item.title}</Text>
        <SalePrice amount={splitPrice(item.price).amount} originalPrice={item.originalPrice} discountPercent={item.discountPercent} compact />
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
          {item.location}
          {item.distanceKm != null ? ` · ${formatDistance(item.distanceKm)}` : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
          <StarsCount rating={item.rating || 0} count={item.reviewCount || 0} compact />
          {item.verified ? <Text style={{ fontSize: 11, color: GREEN, fontWeight: "800" }}>Verified</Text> : null}
          <View style={{ flex: 1 }} />
          <BookmarkBtn id={item.id} />
        </View>
      </View>
    </PressScale>
  );
}

function ListingAdCard({
  item,
  width,
  photoH,
  compact,
  flush,
  urgent,
}: {
  item: CatalogItem;
  width?: number;
  photoH: number;
  compact?: boolean;
  flush?: boolean;
  urgent?: boolean;
}) {
  const navigation = useNavigation<any>();
  const blurb = listingBlurb(item);
  const { amount, unit } = splitPrice(item.price);
  const badge = item.urgent
    ? "URGENT"
    : item.badge === "BOOSTED" || item.badge === "FEATURED"
      ? "BOOSTED"
      : item.badge === "VERIFIED"
        ? "VERIFIED"
        : null;
  const badgeColor = item.urgent ? "#EAB308" : badge === "BOOSTED" ? "#EA580C" : GREEN;

  const compactBodyMin = 108;
  const cardMinHeight = compact ? photoH + compactBodyMin : undefined;

  return (
    <PressScale
      onPress={() => openListing(navigation, item.id)}
      style={{
        width,
        minHeight: cardMinHeight,
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: compact ? 0 : 14,
        marginHorizontal: compact || flush ? 0 : 16,
        ...shadow.card,
      }}
    >
      {item.photo ? (
        <View>
          <AppImage source={item.photo} style={{ width: "100%", height: photoH, backgroundColor: "#E8EEF0" }} recyclingKey={item.id} priority="normal" />
          {badge ? (
            <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: badgeColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, zIndex: 1 }}>
              <Text style={{ color: item.urgent ? "#111827" : "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 }}>{badge}</Text>
            </View>
          ) : null}
          {item.sold ? (
            <View style={{ position: "absolute", top: badge ? 26 : 8, left: 8, backgroundColor: "#DC2626", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, zIndex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 }}>SOLD</Text>
            </View>
          ) : null}
          <View style={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}>
            <HeartSave id={item.id} />
          </View>
        </View>
      ) : null}

      <View style={{ padding: compact ? 10 : 14, paddingBottom: compact ? 10 : 12, flex: compact ? 1 : undefined, minHeight: compact ? compactBodyMin : undefined }}>
        <Text style={{ fontWeight: "800", fontSize: compact ? 13 : 17, color: colors.navy }} numberOfLines={1}>
          {item.title}
        </Text>
        {!compact ? (
          <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18, marginTop: 6 }} numberOfLines={2}>
            {blurb}
          </Text>
        ) : null}
        <View style={{ marginTop: compact ? 5 : 8, minHeight: compact ? 28 : undefined }}>
          <SalePrice amount={amount} unit={unit} originalPrice={item.originalPrice} discountPercent={item.discountPercent} compact={compact} />
        </View>
        {item.urgent && item.urgentEndsAt ? (
          <UrgentCountdownInline endsAt={item.urgentEndsAt} />
        ) : compact ? (
          <View style={{ minHeight: 16 }} />
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: compact ? 6 : 10, minHeight: compact ? 36 : undefined }}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="location-outline" size={compact ? 11 : 14} color="#9AA0A6" />
              <Text style={{ color: "#6B7280", fontSize: compact ? 10 : 13, flex: 1 }} numberOfLines={1}>
                {item.location}
                {item.distanceKm != null ? ` · ${formatDistance(item.distanceKm)}` : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: compact ? 4 : 6, minHeight: compact ? 14 : undefined }}>
              {item.reviewCount ? (
                <StarsCount rating={item.rating || 0} count={item.reviewCount} compact={compact} />
              ) : (
                <>
                  <Ionicons name="time-outline" size={compact ? 11 : 14} color="#9AA0A6" />
                  <Text style={{ color: "#6B7280", fontSize: compact ? 10 : 13 }} numberOfLines={1}>
                    {compact ? item.time : postedLabel(item.time)}
                  </Text>
                </>
              )}
              {item.verified ? <Text style={{ color: GREEN, fontSize: compact ? 10 : 12, fontWeight: "800", marginLeft: 4 }}>Verified</Text> : null}
            </View>
          </View>
          <View
            style={{
              width: compact ? 28 : 40,
              height: compact ? 28 : 40,
              borderRadius: compact ? 8 : 10,
              borderWidth: 1.5,
              borderColor: "#CDEBD5",
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={categoryIcon(item)} size={compact ? 14 : 18} color={GREEN} />
          </View>
        </View>
      </View>
    </PressScale>
  );
}

export function SimilarProductCard({ item }: { item: CatalogItem }) {
  return <ListingAdCard item={item} width={LISTING_CARD_W} photoH={Math.round(LISTING_CARD_W * 0.68)} compact />;
}

export { GREEN, LINE };
export const classifiedColors = { green: GREEN, line: LINE, muted: colors.muted };
