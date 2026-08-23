import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { useAppRefreshControl } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useSavedListings } from "../context/SavedListings";
import { listingsToCatalog } from "../data/liveListings";
import { fetchSavedListings, type ApiListing } from "../listingsApi";
import { openListing } from "../navigation/browse";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

const tabs = [
  { key: "All", icon: "bookmark-outline" as const, activeIcon: "bookmark" as const },
  { key: "Properties", icon: "home-outline" as const, activeIcon: "home" as const },
  { key: "Vehicles", icon: "car-outline" as const, activeIcon: "car" as const },
  { key: "Jobs", icon: "briefcase-outline" as const, activeIcon: "briefcase" as const },
  { key: "Services", icon: "construct-outline" as const, activeIcon: "construct" as const },
];

type SavedItem = {
  id: string;
  category: "Property" | "Vehicle" | "Job" | "Service";
  title: string;
  company?: string;
  location: string;
  price: string;
  savedOn: string;
  photo?: number | { uri: string };
  beds?: number;
  baths?: number;
  sqft?: string;
  fuel?: string;
  trans?: string;
  km?: string;
  tags?: string[];
  rating?: string;
  reviews?: string;
};

const tabMap: Record<string, SavedItem["category"] | "All"> = {
  All: "All",
  Properties: "Property",
  Vehicles: "Vehicle",
  Jobs: "Job",
  Services: "Service",
};

const catalogCategory: Record<string, SavedItem["category"]> = {
  property: "Property",
  vehicles: "Vehicle",
  jobs: "Job",
  services: "Service",
  shops: "Service",
  electronics: "Service",
  used: "Property",
  others: "Service",
};

function fromCatalog(item: ReturnType<typeof listingsToCatalog>[number]): SavedItem {
  return {
    id: item.id,
    category: catalogCategory[item.key] || "Service",
    title: item.title,
    company: item.company,
    location: item.location,
    price: item.price,
    savedOn: "Saved",
    photo: item.photo,
    tags: item.tags,
  };
}

export function SavedScreen() {
  const navigation = useNavigation<any>();
  const { remove, reload } = useSavedListings();
  const [tab, setTab] = useState("All");
  const [banner, setBanner] = useState(true);
  const [rows, setRows] = useState<ApiListing[]>([]);
  const filter = tabMap[tab];

  const load = useCallback(() => {
    return fetchSavedListings()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const extras = useMemo(() => listingsToCatalog(rows).map(fromCatalog), [rows]);
  const list = filter === "All" ? extras : extras.filter((item) => item.category === filter);
  const refreshControl = useAppRefreshControl(async () => {
    await load();
    await reload();
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AppHeader right="bell-chat" />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#EEF0F3" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827" }}>Saved Items</Text>
            <Text style={{ color: "#8A8F98", marginTop: 3, fontSize: 13 }}>All the listings you saved</Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              borderWidth: 1.5,
              borderColor: GREEN,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 22,
              marginTop: 4,
            }}
          >
            <Ionicons name="pencil" size={13} color={GREEN} />
            <Text style={{ color: GREEN, fontWeight: "700", fontSize: 13 }}>Manage</Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            marginTop: 16,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#E6E8EC",
            borderRadius: 16,
            overflow: "hidden",
            paddingHorizontal: 4,
          }}
        >
          {tabs.map((item) => {
            const on = item.key === tab;
            return (
              <PressScale key={item.key} onPress={() => setTab(item.key)} style={{ flex: 1, alignItems: "center", paddingTop: 13 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: 10 }}>
                  <Ionicons name={item.icon} size={17} color={on ? GREEN : "#111827"} />
                  <Text
                    style={{ fontWeight: "700", fontSize: 12, color: on ? GREEN : "#111827" }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {item.key}
                  </Text>
                </View>
                <View style={{ height: 3.5, width: "86%", borderRadius: 2, backgroundColor: on ? GREEN : "transparent" }} />
              </PressScale>
            );
          })}
        </View>
      </View>

      <ScrollView refreshControl={refreshControl} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {list.map((item) => (
          <SavedCard
            key={item.id}
            item={item}
            onOpen={() => openListing(navigation, item.id)}
            onRemove={() => remove(item.id)}
          />
        ))}

        {list.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>No saved listings yet.</Text>
        ) : null}

        {banner ? (
          <View
            style={{
              marginTop: 4,
              backgroundColor: "#F3F4F6",
              borderRadius: 16,
              padding: 14,
              paddingRight: 28,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="heart" size={28} color={GREEN} />
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={{ fontWeight: "800", fontSize: 14, color: "#111827" }}>Like what you see?</Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2, lineHeight: 16 }}>
                Save items you love and access them anytime.
              </Text>
            </View>
            <View style={{ width: 52, alignItems: "center" }}>
              <Ionicons name="folder" size={30} color={GREEN} />
              <View style={{ flexDirection: "row", marginTop: -2, gap: 3 }}>
                <Ionicons name="home" size={11} color="#1D4ED8" />
                <Ionicons name="car" size={11} color="#C2410C" />
                <Ionicons name="briefcase" size={11} color={GREEN} />
              </View>
            </View>
            <Pressable onPress={() => setBanner(false)} hitSlop={8} style={{ position: "absolute", top: 8, right: 8 }}>
              <Ionicons name="close" size={16} color="#9AA0A6" />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SavedCard({ item, onRemove, onOpen }: { item: SavedItem; onRemove: () => void; onOpen: () => void }) {
  return (
    <PressScale onPress={onOpen} style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 10, marginBottom: 12, ...shadow.card }}>
      {item.photo ? (
      <View style={{ width: 104, height: 104, borderRadius: 12, overflow: "hidden" }}>
        <Image source={item.photo} style={{ width: "100%", height: "100%" }} />
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="heart" size={13} color={colors.red} />
        </View>
        <View
          style={{
            position: "absolute",
            left: 6,
            bottom: 6,
            backgroundColor: GREEN,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{item.category}</Text>
        </View>
      </View>
      ) : null}

      <View style={{ flex: 1, marginLeft: item.photo ? 10 : 0, marginRight: 8 }}>
        <Text style={{ fontWeight: "800", fontSize: 14, color: "#111827" }} numberOfLines={1}>
          {item.title}
        </Text>
        {item.company ? (
          <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 1 }} numberOfLines={1}>
            {item.company}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={12} color="#9AA0A6" />
          <Text style={{ color: "#6B7280", fontSize: 12 }}>{item.location}</Text>
        </View>
        <Text style={{ color: GREEN, fontWeight: "800", marginTop: 5, fontSize: 15 }}>{item.price}</Text>

        {item.beds != null ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            <Meta icon="bed-outline" text={`${item.beds} Beds`} />
            <Meta icon="water-outline" text={`${item.baths} Baths`} />
            <Meta icon="resize-outline" text={item.sqft ?? ""} />
          </View>
        ) : null}

        {item.fuel ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            <Meta icon="flame-outline" text={item.fuel} />
            <Meta icon="settings-outline" text={item.trans ?? ""} />
            <Meta icon="speedometer-outline" text={item.km ?? ""} />
          </View>
        ) : null}

            {item.tags ? (
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {item.tags.map((tag, index) => (
              <View key={`${tag}-${index}`} style={{ backgroundColor: "#E7F6EC", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ color: GREEN, fontSize: 10, fontWeight: "700" }}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.rating ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
            <Ionicons name="star" size={13} color="#F5C518" />
            <Text style={{ fontWeight: "800", fontSize: 12, color: "#111827" }}>{item.rating}</Text>
            <Text style={{ color: "#9AA0A6", fontSize: 11 }}>({item.reviews})</Text>
          </View>
        ) : null}

        <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 8 }}>Saved on {item.savedOn}</Text>
      </View>

      <View style={{ justifyContent: "space-between", paddingVertical: 2 }}>
        <Ionicons name="share-social-outline" size={18} color="#9AA0A6" />
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
        </Pressable>
      </View>
    </PressScale>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Ionicons name={icon} size={12} color="#9AA0A6" />
      <Text style={{ color: "#6B7280", fontSize: 10 }}>{text}</Text>
    </View>
  );
}
