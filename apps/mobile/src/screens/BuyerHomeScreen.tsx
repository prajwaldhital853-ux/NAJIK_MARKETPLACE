import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Dimensions, Image, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { ListingGrid } from "../components/ClassifiedCard";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useBuyerLocation } from "../context/BuyerLocationContext";
import { homeCategoryKey, type CatalogItem } from "../data/catalog";
import { listingsToCatalog } from "../data/liveListings";
import { fetchListingFeed } from "../listingsApi";
import { subscribeListingsChanged } from "../listingsRefresh";
import { openCategory } from "../navigation/browse";
import { colors, shadow } from "../theme";

const housePhoto = require("../../assets/listings/house.jpg");

const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const GAP = 11;
const TILE = (SCREEN_W - PAD * 2 - GAP * 3) / 4;
const FOREST = "#0E4A3C";
const GREEN = "#1B7D2C";

const categories: { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }[] = [
  { label: "Property", icon: "home", bg: "#E8F1FE", color: "#1D4ED8" },
  { label: "Vehicles", icon: "car", bg: "#E8F1FE", color: "#1D4ED8" },
  { label: "Jobs", icon: "briefcase", bg: "#FFF1E0", color: "#C2410C" },
  { label: "Services", icon: "construct", bg: "#FFF1E8", color: "#C2410C" },
  { label: "Used Items", icon: "bed", bg: "#EAF8EE", color: "#166534" },
  { label: "Shops", icon: "storefront", bg: "#FDECEC", color: "#DC2626" },
  { label: "Electronics", icon: "phone-portrait", bg: "#EEF4FF", color: "#1D4ED8" },
  { label: "Others", icon: "apps", bg: "#EEF4FF", color: "#1D4ED8" },
];

export function BuyerHomeScreen() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader showLocation />
      <KeyboardScreen contentStyle={{ padding: PAD, paddingTop: 10, paddingBottom: 28 }} style={{ backgroundColor: "#F7F8FA" }}>
        <BuyerHomeBody query={query} setQuery={setQuery} submitted={submitted} setSubmitted={setSubmitted} />
      </KeyboardScreen>
    </View>
  );
}

function BuyerHomeBody({
  query,
  setQuery,
  submitted,
  setSubmitted,
}: {
  query: string;
  setQuery: (v: string) => void;
  submitted: string;
  setSubmitted: (v: string) => void;
}) {
  const navigation = useNavigation<any>();
  const { onInputFocus } = useKeyboardScroll();
  const { place } = useBuyerLocation();

  function runSearch() {
    setSubmitted(query.trim());
  }

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: 18,
          paddingLeft: 14,
          height: 52,
          ...shadow.card,
        }}
      >
        <Ionicons name="search" size={18} color="#9AA0A6" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={onInputFocus}
          placeholder={`Search ${place.source === "all" ? "across Nepal" : `in ${place.label}`}...`}
          placeholderTextColor="#9AA0A6"
          returnKeyType="search"
          onSubmitEditing={runSearch}
          style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy }}
        />
        <PressScale
          onPress={runSearch}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: GREEN,
            alignItems: "center",
            justifyContent: "center",
            margin: 4,
          }}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </PressScale>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: GAP }}>
        {categories.map((item) => (
          <PressScale
            key={item.label}
            onPress={() => openCategory(navigation, homeCategoryKey[item.label] ?? "property")}
            style={{
              width: TILE,
              backgroundColor: item.bg,
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 2,
              alignItems: "center",
            }}
          >
            <Ionicons name={item.icon} size={34} color={item.color} />
            <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 4, color: "#111827" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {item.label}
            </Text>
          </PressScale>
        ))}
      </View>

      {!submitted ? (
        <View style={{ marginTop: 18, height: 156, borderRadius: 18, overflow: "hidden", ...shadow.card }}>
          <Image source={housePhoto} style={{ position: "absolute", right: 0, top: 0, width: "62%", height: "100%" }} resizeMode="cover" />
          <LinearGradient
            colors={[FOREST, FOREST, "rgba(14,74,60,0.55)", "transparent"]}
            locations={[0, 0.36, 0.58, 0.86]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: 0 }}
          />
          <View style={{ position: "absolute", left: 16, top: 18, right: "36%" }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 24 }}>
              Find the Best{"\n"}
              <Text style={{ color: "#7CDE6A" }}>Property</Text> Near You
            </Text>
            <Text style={{ color: "#D5EDE4", marginTop: 4, fontSize: 12 }}>Trusted. Local. Easy.</Text>
            <PressScale
              onPress={() => openCategory(navigation, "property")}
              style={{
                marginTop: 12,
                alignSelf: "flex-start",
                backgroundColor: "#fff",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text style={{ color: FOREST, fontWeight: "800", fontSize: 12 }}>Browse property</Text>
              <Ionicons name="arrow-forward" size={12} color={FOREST} />
            </PressScale>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>
          {submitted ? `Results in ${place.label}` : place.source === "all" ? "Latest listings" : `Nearby in ${place.label}`}
        </Text>
        {submitted ? (
          <PressScale onPress={() => { setQuery(""); setSubmitted(""); }}>
            <Text style={{ color: GREEN, fontWeight: "700" }}>Clear</Text>
          </PressScale>
        ) : (
          <PressScale onPress={() => openCategory(navigation, "property")}>
            <Text style={{ color: GREEN, fontWeight: "700" }}>View all ›</Text>
          </PressScale>
        )}
      </View>
      <NearbyAds keyword={submitted} />
    </>
  );
}

function NearbyAds({ keyword }: { keyword: string }) {
  const { feedParams, place } = useBuyerLocation();
  const [live, setLive] = useState<CatalogItem[]>([]);

  useEffect(() => {
    const load = () => {
      void fetchListingFeed({ ...feedParams, q: keyword || undefined })
        .then((rows) => setLive(listingsToCatalog(rows)))
        .catch(() => setLive([]));
    };
    load();
    return subscribeListingsChanged(load);
  }, [keyword, feedParams.place, feedParams.lat, feedParams.lng, feedParams.radius_km]);

  if (!live.length) {
    return (
      <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, ...shadow.card }}>
        <Text style={{ color: colors.muted, textAlign: "center" }}>
          {keyword
            ? `No matches for “${keyword}”${place.source === "all" ? "" : ` in ${place.label}`}. Try a related word like apartment, for rent, car, or bike.`
            : place.source === "all"
              ? "No listings yet."
              : `No listings in ${place.label} yet. Choose All Nepal or another place from the pin above.`}
        </Text>
      </View>
    );
  }

  return <ListingGrid items={live} />;
}
