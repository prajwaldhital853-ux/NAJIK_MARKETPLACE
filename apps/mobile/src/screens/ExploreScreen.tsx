import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Dimensions, Image, Pressable, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { exploreBrowseKey, type CatalogItem } from "../data/catalog";
import { listingsToCatalog } from "../data/liveListings";
import { fetchListingFeed } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openCategory, openMapSearch } from "../navigation/browse";
import { loadRecentSearches, removeRecentSearch, saveRecentSearch } from "../recentSearches";
import { colors, shadow } from "../theme";

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 8;
const CARD_W = Math.floor((SCREEN_W - PAD * 2 - GAP * 2) / 3);
const CHIP_W = (SCREEN_W - PAD * 2) / 8;
const BOX = Math.min(42, CHIP_W - 4);
const GREEN = "#1B7D2C";

const chips: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { key: "all", label: "All", icon: "apps", color: "#166534", bg: "#E7F6EC" },
  { key: "property", label: "Property", icon: "home", color: "#166534", bg: "#E7F6EC" },
  { key: "vehicles", label: "Vehicles", icon: "car", color: "#1E3A8A", bg: "#E8F0FE" },
  { key: "jobs", label: "Jobs", icon: "briefcase", color: "#9A3412", bg: "#FFF1E0" },
  { key: "services", label: "Services", icon: "construct", color: "#5B21B6", bg: "#F3EEFF" },
  { key: "shops", label: "Shops", icon: "storefront", color: "#B91C1C", bg: "#FDECEC" },
  { key: "used", label: "Used", icon: "pricetag", color: "#166534", bg: "#E7F6EC" },
  { key: "more", label: "More", icon: "ellipsis-horizontal", color: "#4B5563", bg: "#F3F4F6" },
];

const browse = [
  { id: "houses", title: "Houses", icon: "home" as const, tint: "#22A34A", photo: require("../../assets/listings/house.jpg") },
  { id: "apartments", title: "Apartments", icon: "business" as const, tint: "#2563EB", photo: require("../../assets/listings/building.jpg") },
  { id: "land", title: "Land", icon: "leaf" as const, tint: "#22A34A", photo: require("../../assets/listings/land.jpg") },
  { id: "office", title: "Office Space", icon: "storefront" as const, tint: "#EA580C", photo: require("../../assets/listings/office.jpg") },
  { id: "cars", title: "Cars", icon: "car" as const, tint: "#22A34A", photo: require("../../assets/listings/car.jpg") },
  { id: "bikes", title: "Bikes", icon: "construct" as const, tint: "#7C3AED", photo: require("../../assets/listings/bike.jpg") },
  { id: "jobs", title: "Jobs", icon: "briefcase" as const, tint: "#2563EB", photo: require("../../assets/listings/jobs.jpg") },
  { id: "services", title: "Services", icon: "construct" as const, tint: "#22A34A", photo: require("../../assets/listings/services.jpg") },
  { id: "shops", title: "Shops", icon: "storefront" as const, tint: "#E53935", photo: require("../../assets/listings/shop.jpg") },
  { id: "used", title: "Used Items", icon: "pricetag" as const, tint: "#16A34A", photo: require("../../assets/listings/shop.jpg") },
];

function hay(item: CatalogItem) {
  return `${item.title} ${item.tags.join(" ")} ${item.extra.join(" ")} ${item.key}`.toLowerCase();
}

function countBrowse(id: string, items: CatalogItem[]) {
  if (id === "jobs") return items.filter((item) => item.key === "jobs").length;
  if (id === "services") return items.filter((item) => item.key === "services").length;
  if (id === "shops") return items.filter((item) => item.key === "shops").length;
  if (id === "used") return items.filter((item) => item.key === "used" || item.key === "electronics").length;
  const vehicles = items.filter((item) => item.key === "vehicles");
  if (id === "bikes") return vehicles.filter((item) => /bike|scooter|motorcycle/.test(hay(item))).length;
  if (id === "cars") {
    const bikes = vehicles.filter((item) => /bike|scooter|motorcycle/.test(hay(item))).length;
    return Math.max(0, vehicles.length - bikes) || vehicles.filter((item) => /car|suv|jeep/.test(hay(item))).length;
  }
  const props = items.filter((item) => item.key === "property");
  if (id === "land") return props.filter((item) => /land|plot|aana|ropani/.test(hay(item))).length;
  if (id === "office") return props.filter((item) => /office|workspace/.test(hay(item))).length;
  if (id === "apartments") return props.filter((item) => /apartment|flat|room|bhk/.test(hay(item))).length;
  if (id === "houses") {
    const typed = props.filter((item) => /land|plot|office|apartment|flat|room/.test(hay(item))).length;
    return Math.max(props.filter((item) => /house|home|villa|bungalow/.test(hay(item))).length, props.length - typed);
  }
  return 0;
}

const popular = [
  { label: "House for Rent", icon: "home-outline" as const, color: GREEN, bg: "#E7F6EC", key: "property" as const, filter: "For Rent" },
  { label: "Land for Sale", icon: "map-outline" as const, color: "#2563EB", bg: "#E8F1FE", key: "property" as const, filter: "Land" },
  { label: "IT Jobs", icon: "briefcase-outline" as const, color: "#EA580C", bg: "#FFF1E0", key: "jobs" as const, filter: "Full Time" },
];

const faces: string[] = [];

const IMG_H = 72;

const houseHero = require("../../assets/listings/house.jpg");

export function ExploreScreen() {
  const [activeChip, setActiveChip] = useState("all");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [adOpen, setAdOpen] = useState(true);

  useEffect(() => {
    void loadRecentSearches().then(setRecent);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell-filter" showLocation pinColor="#22A34A" />
      <KeyboardScreen adjustKeyboardInsets={false} contentStyle={{ padding: PAD, paddingTop: 8, paddingBottom: 28 }}>
        <ExploreBody
          query={query}
          setQuery={setQuery}
          activeChip={activeChip}
          setActiveChip={setActiveChip}
          recent={recent}
          setRecent={setRecent}
          adOpen={adOpen}
          setAdOpen={setAdOpen}
        />
      </KeyboardScreen>
    </View>
  );
}

function ExploreBody({
  query,
  setQuery,
  activeChip,
  setActiveChip,
  recent,
  setRecent,
  adOpen,
  setAdOpen,
}: {
  query: string;
  setQuery: (v: string) => void;
  activeChip: string;
  setActiveChip: (v: string) => void;
  recent: string[];
  setRecent: (v: string[]) => void;
  adOpen: boolean;
  setAdOpen: (v: boolean) => void;
}) {
  const { onInputFocus } = useKeyboardScroll();
  const navigation = useNavigation<any>();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = () => {
      void fetchListingFeed()
        .then((rows) => {
          const items = listingsToCatalog(rows);
          const next: Record<string, number> = {};
          browse.forEach((item) => {
            next[item.id] = countBrowse(item.id, items);
          });
          setCounts(next);
        })
        .catch(() => setCounts({}));
    };
    load();
    return subscribeListingsChanged(load);
  }, []);

  async function runSearch(term = query) {
    const q = term.trim();
    if (q) setRecent(await saveRecentSearch(q));
    openMapSearch(navigation, { q });
  }

  return (
    <>
      <View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 16,
            paddingLeft: 12,
            height: 50,
            borderWidth: 1,
            borderColor: "#E6E8EC",
          }}
        >
          <Ionicons name="search" size={18} color="#9AA0A6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search rooms, land, jobs, services..."
            placeholderTextColor="#9AA0A6"
            onFocus={onInputFocus}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
            style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy }}
          />
          <PressScale
            onPress={() => openMapSearch(navigation, { q: query })}
            style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: "#111827", alignItems: "center", justifyContent: "center", marginRight: 2 }}
          >
            <Ionicons name="map" size={18} color="#fff" />
          </PressScale>
          <PressScale
            onPress={() => void runSearch()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              backgroundColor: GREEN,
              alignItems: "center",
              justifyContent: "center",
              margin: 4,
            }}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </PressScale>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 14 }}>
        {chips.map((chip) => {
          const on = chip.key === activeChip;
          return (
            <PressScale
              key={chip.key}
              onPress={() => {
                setActiveChip(chip.key);
                if (chip.key === "all") return;
                if (chip.key === "more") {
                  openCategory(navigation, "others");
                  return;
                }
                openCategory(navigation, chip.key as "property" | "vehicles" | "jobs" | "services" | "shops" | "used");
              }}
              style={{ width: CHIP_W, alignItems: "center" }}
            >
              <View
                style={{
                  width: BOX,
                  height: BOX,
                  borderRadius: 12,
                  backgroundColor: on ? GREEN : chip.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={chip.icon} size={20} color={on ? "#fff" : chip.color} />
              </View>
              <View
                style={{
                  marginTop: 4,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 8,
                  backgroundColor: on ? "#E8EEF0" : "transparent",
                }}
              >
                <Text
                  style={{ fontSize: 9, fontWeight: "700", color: "#111827", textAlign: "center" }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {chip.label}
                </Text>
              </View>
            </PressScale>
          );
        })}
      </View>

      <View style={{ marginTop: 16, height: 168, borderRadius: 20, overflow: "hidden", backgroundColor: "#E7EDF4", ...shadow.card }}>
        <Image source={houseHero} style={{ position: "absolute", right: -8, top: 0, width: "58%", height: "100%" }} resizeMode="cover" />
        <LinearGradient
          colors={["#E8EEF5", "#E8EEF5", "rgba(232,238,245,0.55)", "transparent"]}
          locations={[0, 0.38, 0.55, 0.78]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: 0 }}
        />
        <View style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 16, width: "56%", height: "100%", justifyContent: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", lineHeight: 28 }}>
            Find Everything{"\n"}
            <Text style={{ color: GREEN }}>You Need</Text>
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 6, lineHeight: 16 }}>
            Homes, Jobs, Services and more — all in one place.
          </Text>
          <PressScale
            onPress={() => openCategory(navigation, "property")}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              backgroundColor: GREEN,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Explore Now</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </PressScale>
        </View>
        <View
          style={{
            position: "absolute",
            left: "46%",
            bottom: 14,
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            ...shadow.card,
          }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#E7F6EC", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="bag-handle" size={12} color={GREEN} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: "800", color: "#111827" }}>Browse listings</Text>
        </View>
      </View>

      <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>Browse by Category</Text>
        <PressScale onPress={() => openCategory(navigation, "property")} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ color: GREEN, fontWeight: "700", fontSize: 13 }}>View all</Text>
          <Ionicons name="chevron-forward" size={14} color={GREEN} />
        </PressScale>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
        {browse.map((item) => (
          <PressScale
            key={item.id}
            onPress={() => {
              const target = exploreBrowseKey[item.id];
              openCategory(navigation, target?.key ?? "property", target?.filter);
            }}
            style={{
              width: CARD_W,
              backgroundColor: "#fff",
              borderRadius: 14,
              paddingBottom: 8,
              ...shadow.card,
            }}
          >
            <View style={{ height: IMG_H, borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: "hidden" }}>
              <Image source={item.photo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </View>
            <View
              style={{
                position: "absolute",
                left: 8,
                top: IMG_H - 12,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: item.tint,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#fff",
              }}
            >
              <Ionicons name={item.icon} size={11} color="#fff" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 8, paddingTop: 14 }}>
              <View style={{ flex: 1, paddingRight: 2 }}>
                <Text style={{ fontWeight: "800", fontSize: 11, color: "#111827" }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ fontWeight: "800", fontSize: 14, color: item.tint, marginTop: 2 }}>{counts[item.id] ?? 0}</Text>
                <Text style={{ fontSize: 9, color: "#9AA0A6", marginTop: 1 }}>Listings</Text>
              </View>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#F1F2F4",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 2,
                }}
              >
                <Ionicons name="arrow-forward" size={11} color="#4B5563" />
              </View>
            </View>
          </PressScale>
        ))}
      </View>
      </View>

      <View>
      {adOpen ? (
        <View
          style={{
            marginTop: 16,
            backgroundColor: "#F4F6F5",
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 14,
            paddingRight: 22,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E6E8EC",
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontWeight: "800", fontSize: 15, color: "#111827" }}>Advertise to Thousands</Text>
            <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 3, lineHeight: 15 }}>
              Post your ad for free and reach thousands of people in your area.
            </Text>
            <PressScale
              onPress={() => navigation.jumpTo("Post")}
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                backgroundColor: GREEN,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Post Your Ad</Text>
            </PressScale>
          </View>
          <View style={{ width: 96, height: 84 }}>
            <Ionicons
              name="megaphone"
              size={42}
              color={GREEN}
              style={{ position: "absolute", left: 8, top: 18, transform: [{ rotate: "-18deg" }] }}
            />
            {faces.map((uri, i) => {
              const spots = [
                { top: 0, left: 52 },
                { top: 8, left: 74 },
                { top: 40, left: 70 },
                { top: 58, left: 48 },
              ];
              return (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{
                    position: "absolute",
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: "#fff",
                    backgroundColor: "#E8EEF0",
                    ...spots[i],
                  }}
                />
              );
            })}
          </View>
          <Pressable onPress={() => setAdOpen(false)} hitSlop={8} style={{ position: "absolute", top: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="#9AA0A6" />
          </Pressable>
        </View>
      ) : null}

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 20, marginBottom: 10 }}>Popular Searches</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {popular.map((item) => (
          <PressScale
            key={item.label}
            onPress={() => {
              void saveRecentSearch(item.label).then(setRecent);
              openMapSearch(navigation, { q: item.label, key: item.key });
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: item.color,
              backgroundColor: item.bg,
            }}
          >
            <Ionicons name={item.icon} size={14} color={item.color} />
            <Text style={{ fontWeight: "700", fontSize: 12, color: item.color }}>{item.label}</Text>
          </PressScale>
        ))}
      </View>

      {recent.length ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 18, marginBottom: 10 }}>Recent Searches</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {recent.map((item) => (
              <PressScale
                key={item}
                onPress={() => openMapSearch(navigation, { q: item })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingLeft: 12,
                  paddingRight: 8,
                  paddingVertical: 7,
                  borderRadius: 18,
                  backgroundColor: "#EEF0F2",
                }}
              >
                <Text style={{ fontSize: 12, color: "#4B5563", fontWeight: "600" }}>{item}</Text>
                <Pressable onPress={() => void removeRecentSearch(item).then(setRecent)} hitSlop={6}>
                  <Ionicons name="close" size={14} color="#9AA0A6" />
                </Pressable>
              </PressScale>
            ))}
          </View>
        </>
      ) : null}
      </View>
    </>
  );
}
