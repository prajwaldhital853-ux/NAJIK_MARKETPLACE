import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Alert, Dimensions, Image, Pressable, Share, Text, View } from "react-native";
import { catalogMeta, listingBlurb, type CatalogItem } from "../data/catalog";
import { formatDistance } from "../geo";
import { openListing } from "../navigation/browse";
import { colors, shadow } from "../theme";
import { useSavedListings } from "../context/SavedListings";
import { PressScale } from "./PressScale";

const GREEN = "#1B7D2C";
const LINE = "#E8E8E8";
const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 11;
export const LISTING_CARD_W = (SCREEN_W - PAD * 2 - GAP) / 2;

export function classifiedMore(item: CatalogItem) {
  Alert.alert(item.title, undefined, [
    { text: "Share", onPress: () => void Share.share({ message: `${item.title} · ${item.price}\n${item.location}` }) },
    { text: "Report ad", onPress: () => Alert.alert("Report", "Demo: this ad was flagged.") },
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
  if (item.badge === "FEATURED") tags.push("Featured");
  if (item.badge === "VERIFIED") tags.push("Verified");
  item.tags.forEach((tag) => {
    if (tag !== "All" && !tags.includes(tag)) tags.push(tag);
  });
  return tags.slice(0, 3);
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

export function ListingGrid({ items }: { items: CatalogItem[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {items.map((item) => (
        <ClassifiedGridCard key={item.id} item={item} width={LISTING_CARD_W} />
      ))}
    </View>
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
      {item.photo ? <Image source={item.photo} style={{ width: 92, height: 92, borderRadius: 10, backgroundColor: "#E8EEF0" }} /> : (
        <View style={{ width: 92, height: 92, borderRadius: 10, backgroundColor: "#E8EEF0" }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", color: colors.navy }} numberOfLines={2}>{item.title}</Text>
        <Text style={{ color: GREEN, fontWeight: "800", marginTop: 4 }}>{splitPrice(item.price).amount}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
          {item.location}
          {item.distanceKm != null ? ` · ${formatDistance(item.distanceKm)}` : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
          {item.rating ? <Text style={{ fontSize: 11, fontWeight: "700" }}>★ {item.rating}</Text> : null}
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
}: {
  item: CatalogItem;
  width?: number;
  photoH: number;
  compact?: boolean;
  flush?: boolean;
}) {
  const navigation = useNavigation<any>();
  const blurb = listingBlurb(item);
  const { amount, unit } = splitPrice(item.price);
  const badge = item.badge === "FEATURED" ? "FEATURED" : item.badge === "VERIFIED" ? "VERIFIED" : null;

  return (
    <PressScale
      onPress={() => openListing(navigation, item.id)}
      style={{
        width,
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
          <Image source={item.photo} style={{ width: "100%", height: photoH, backgroundColor: "#E8EEF0" }} />
          {badge ? (
            <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: GREEN, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 }}>{badge}</Text>
            </View>
          ) : null}
          <View style={{ position: "absolute", top: 6, right: 6 }}>
            <HeartSave id={item.id} />
          </View>
        </View>
      ) : null}

      <View style={{ padding: compact ? 10 : 14, paddingBottom: compact ? 10 : 12 }}>
        <Text style={{ fontWeight: "800", fontSize: compact ? 13 : 17, color: colors.navy }} numberOfLines={1}>
          {item.title}
        </Text>
        {!compact ? (
          <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18, marginTop: 6 }} numberOfLines={2}>
            {blurb}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: compact ? 5 : 8, flexWrap: "wrap" }}>
          <Text style={{ fontWeight: "800", fontSize: compact ? 13 : 18, color: GREEN }}>{amount}</Text>
          {unit ? <Text style={{ color: "#8A8F98", fontSize: compact ? 10 : 13, marginLeft: 3 }}>{unit}</Text> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: compact ? 8 : 10 }}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="location-outline" size={compact ? 11 : 14} color="#9AA0A6" />
              <Text style={{ color: "#6B7280", fontSize: compact ? 10 : 13, flex: 1 }} numberOfLines={1}>
                {item.location}
                {item.distanceKm != null ? ` · ${formatDistance(item.distanceKm)}` : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: compact ? 4 : 6 }}>
              {item.rating ? (
                <>
                  <Ionicons name="star" size={compact ? 11 : 14} color="#F59E0B" />
                  <Text style={{ color: "#6B7280", fontSize: compact ? 10 : 13 }}>{item.rating}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="time-outline" size={compact ? 11 : 14} color="#9AA0A6" />
                  <Text style={{ color: "#6B7280", fontSize: compact ? 10 : 13 }}>{compact ? item.time : postedLabel(item.time)}</Text>
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
