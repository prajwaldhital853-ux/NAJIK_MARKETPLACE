import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../components/AppHeader";
import { classifiedMore, ConditionPill, LINE, ListingGrid, listingTags, postedLabel } from "../components/ClassifiedCard";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useSavedListings } from "../context/SavedListings";
import { catalogMeta, listingById, listingsFor, type CatalogItem } from "../data/catalog";
import { richFor, type Review } from "../data/listingDetails";

const GREEN = "#1B7D2C";
const PHONE = "+9779812345678";
const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_H = Math.round(SCREEN_W * 0.72);

type TabKey = "description" | "comments" | "location";

const infoLinks = ["Safety Tips", "Posting Rules", "FAQ", "Terms of Use", "Privacy Policy", "Contact Us", "Report bugs"];

export function ListingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { has, toggle } = useSavedListings();
  const item = listingById(route.params?.id ?? "");

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontWeight: "800", fontSize: 16 }}>Listing not found</Text>
        <PressScale onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: GREEN, fontWeight: "800" }}>Go back</Text>
        </PressScale>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AppHeader onClose={() => navigation.goBack()} right="bell-chat" bellCount={3} />
      <KeyboardScreen contentStyle={{ paddingBottom: 28 }} style={{ backgroundColor: "#fff" }}>
        <ListingBody item={item} navigation={navigation} saved={has(item.id)} toggle={() => toggle(item.id)} />
      </KeyboardScreen>
    </View>
  );
}

function ListingBody({
  item,
  navigation,
  saved,
  toggle,
}: {
  item: CatalogItem;
  navigation: any;
  saved: boolean;
  toggle: () => void;
}) {
  const insets = useSafeAreaInsets();
  const meta = catalogMeta[item.key];
  const rich = useMemo(() => richFor(item), [item]);
  const related = listingsFor(item.key).filter((row) => row.id !== item.id).slice(0, 6);
  const galleryRef = useRef<FlatList<number>>(null);
  const [photo, setPhoto] = useState(0);
  const [tab, setTab] = useState<TabKey>("description");
  const [more, setMore] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);

  useEffect(() => {
    setPhoto(0);
    setTab("description");
    setMore(false);
    setComment("");
    setComments([]);
    galleryRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [item.id]);

  function onHeroScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== photo && i >= 0 && i < rich.gallery.length) setPhoto(i);
  }

  async function callSeller() {
    const url = `tel:${PHONE}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Call seller", PHONE);
  }

  function chatSeller() {
    Alert.alert("Chat", `Demo chat with ${rich.seller.name}. Mention “${item.title}” from NAJIK.`);
  }

  async function shareListing() {
    try {
      await Share.share({ message: `${item.title} · ${item.price}\n${item.location}\n${rich.gallery.length} photos on NAJIK` });
    } catch {
      /* cancelled */
    }
  }

  const generalRows = [
    { label: "AD ID", value: item.id.toUpperCase() },
    { label: "Category", value: meta.title },
    { label: "Location", value: item.location },
    { label: "Delivery", value: item.key === "electronics" || item.key === "used" ? "Not Available" : "Meetup / visit" },
    { label: "Ads Posted", value: item.time },
    { label: "Ads Expiry", value: "16 Sep 2026" },
  ];

  return (
    <>
      <View style={{ height: PHOTO_H, backgroundColor: "#F3F4F6" }}>
        <FlatList
          ref={galleryRef}
          data={rich.gallery}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={onHeroScroll}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          renderItem={({ item: src }) => (
            <Pressable onPress={() => setLightbox(true)}>
              <Image source={src} style={{ width: SCREEN_W, height: PHOTO_H, backgroundColor: "#E8EEF0" }} resizeMode="cover" />
            </Pressable>
          )}
        />
        <View
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            backgroundColor: "rgba(0,0,0,0.55)",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>
            {photo + 1} / {rich.gallery.length}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LINE }}>
        <Ionicons name="eye-outline" size={15} color="#6B7280" />
        <Text style={{ color: "#6B7280", fontSize: 13, marginLeft: 6, marginRight: 10 }}>{rich.views} views</Text>
        {listingTags(item).map((tag) => (
          <ConditionPill key={tag} label={tag} />
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ fontWeight: "800", fontSize: 22, color: "#111", lineHeight: 28 }}>{item.title}</Text>
        <Text style={{ fontWeight: "800", fontSize: 20, color: GREEN, marginTop: 8 }}>{item.price}</Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 6 }}>{postedLabel(item.time)}</Text>
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: LINE, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person" size={22} color="#6B7280" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontWeight: "700", fontSize: 14, color: "#111" }}>{rich.seller.name}</Text>
            <Pressable onPress={callSeller}>
              <Text style={{ color: GREEN, fontSize: 13, marginTop: 2 }}>{rich.seller.phone}</Text>
            </Pressable>
          </View>
          <View style={{ backgroundColor: "#EFEFEF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 }}>
            <Text style={{ fontWeight: "700", fontSize: 12, color: "#374151" }}>{rich.seller.ads} ads</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 3 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons key={n} name={n <= Math.round(Number(rich.seller.rating)) ? "star" : "star-outline"} size={16} color="#F5C518" />
          ))}
          <Text style={{ color: "#6B7280", fontSize: 12, marginLeft: 6 }}>
            {rich.seller.rating} ({rich.reviewCount})
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <PressScale
            onPress={toggle}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#C4C7CC",
              borderRadius: 6,
              height: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={16} color="#111" />
            <Text style={{ fontWeight: "700", fontSize: 13, color: "#111" }}>{saved ? "Saved" : "Save for later"}</Text>
          </PressScale>
          <PressScale
            onPress={chatSeller}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#C4C7CC",
              borderRadius: 6,
              height: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#111" />
            <Text style={{ fontWeight: "700", fontSize: 13, color: "#111" }}>Start a chat</Text>
          </PressScale>
        </View>

        <View style={{ backgroundColor: "#F7F7F7", padding: 10, marginTop: 12, borderRadius: 4 }}>
          <Text style={{ color: "#4B5563", fontSize: 12, lineHeight: 18 }}>
            Inspect the product physically and check all documents before making any payment. Never pay in advance.{" "}
            <Text
              style={{ color: GREEN, fontWeight: "700" }}
              onPress={() => Alert.alert("Safety", "Meet in a public place. Check papers. Pay only after you are satisfied.")}
            >
              Learn more
            </Text>
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINE }}>
        {(["description", "comments", "location"] as TabKey[]).map((key) => {
          const on = tab === key;
          const label = key === "description" ? "Description" : key === "comments" ? `Comments (${rich.reviewCount + comments.length})` : "Location";
          return (
            <Pressable key={key} onPress={() => setTab(key)} style={{ paddingHorizontal: 12, paddingTop: 10 }}>
              <Text style={{ fontWeight: on ? "700" : "600", fontSize: 14, color: on ? "#111" : "#9AA0A6" }}>{label}</Text>
              <View style={{ height: 3, width: "100%", backgroundColor: on ? "#111" : "transparent", marginTop: 8 }} />
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => classifiedMore(item)} hitSlop={8} style={{ padding: 10 }}>
          <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
        </Pressable>
      </View>

      {tab === "description" ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ color: "#374151", fontSize: 14, lineHeight: 22 }} numberOfLines={more ? undefined : 8}>
            {rich.description}
          </Text>
          <Pressable onPress={() => setMore((v) => !v)} hitSlop={8} style={{ marginTop: 8 }}>
            <Text style={{ color: GREEN, fontWeight: "700", fontSize: 13 }}>{more ? "Show less" : "Read more"}</Text>
          </Pressable>

          {rich.highlights.map((row) => (
            <View key={row} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
              <Text style={{ color: "#111", fontSize: 14 }}>•</Text>
              <Text style={{ color: "#374151", fontSize: 14, flex: 1 }}>{row}</Text>
            </View>
          ))}

          <Text style={{ fontWeight: "800", fontSize: 16, color: "#111", marginTop: 22, marginBottom: 8 }}>General</Text>
          <SpecTable rows={generalRows} />

          <Text style={{ fontWeight: "800", fontSize: 16, color: "#111", marginTop: 18, marginBottom: 8 }}>Specifications</Text>
          <SpecTable rows={rich.specs} />
        </View>
      ) : null}

      {tab === "comments" ? (
        <CommentsTab
          reviews={rich.reviews}
          comments={comments}
          comment={comment}
          setComment={setComment}
          onPost={() => {
            if (!comment.trim()) return;
            setComments((p) => [...p, comment.trim()]);
            setComment("");
          }}
        />
      ) : null}

      {tab === "location" ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <PressScale
            onPress={() => Alert.alert("Location", `${item.location}\nOpen Google Maps from your phone for directions.`)}
            style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: LINE, padding: 14 }}
          >
            <Ionicons name="location" size={22} color={GREEN} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: "#111" }}>{item.location}</Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>Tap for directions</Text>
            </View>
            <Ionicons name="navigate-outline" size={18} color={GREEN} />
          </PressScale>
        </View>
      ) : null}

      {related.length ? (
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Text style={{ fontWeight: "800", fontSize: 16, color: "#111", marginBottom: 10 }}>Similar Products</Text>
          <ListingGrid items={related} />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingTop: 22, gap: 10 }}>
        {infoLinks.map((label) => (
          <Pressable key={label} onPress={() => Alert.alert(label, "NAJIK demo page.")}>
            <Text style={{ color: GREEN, fontSize: 12, textDecorationLine: "underline" }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: "#9AA0A6", fontSize: 11, paddingHorizontal: 16, paddingTop: 12 }}>© 2026 NAJIK. Everything near you.</Text>

      <Modal visible={lightbox} animationType="fade" onRequestClose={() => setLightbox(false)}>
        <View style={{ flex: 1, backgroundColor: "#0B1D2A" }}>
          <Pressable
            onPress={() => setLightbox(false)}
            style={{
              position: "absolute",
              top: insets.top + 12,
              right: 18,
              zIndex: 2,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={shareListing}
            style={{
              position: "absolute",
              top: insets.top + 12,
              left: 18,
              zIndex: 2,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </Pressable>
          <FlatList
            data={rich.gallery}
            horizontal
            pagingEnabled
            initialScrollIndex={photo}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `lb-${i}`}
            renderItem={({ item: src }) => (
              <View style={{ width: SCREEN_W, height: "100%", justifyContent: "center" }}>
                <Image source={src} style={{ width: SCREEN_W, height: SCREEN_W }} resizeMode="contain" />
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

function CommentsTab({
  reviews,
  comments,
  comment,
  setComment,
  onPost,
}: {
  reviews: Review[];
  comments: string[];
  comment: string;
  setComment: (v: string) => void;
  onPost: () => void;
}) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      {reviews.map((review) => (
        <CommentRow key={review.name} review={review} />
      ))}
      {comments.map((text, i) => (
        <View key={i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE }}>
          <Text style={{ fontWeight: "700", fontSize: 13 }}>You</Text>
          <Text style={{ color: "#4B5563", fontSize: 13, marginTop: 6, lineHeight: 20 }}>{text}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 }}>
        <TextInput
          value={comment}
          onChangeText={setComment}
          onFocus={onInputFocus}
          placeholder="Write a comment…"
          placeholderTextColor="#9AA0A6"
          style={{ flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, height: 44, paddingHorizontal: 12, fontSize: 13 }}
        />
        <PressScale onPress={onPost} style={{ backgroundColor: GREEN, height: 44, paddingHorizontal: 14, borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Post</Text>
        </PressScale>
      </View>
    </View>
  );
}

function SpecTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={{ borderWidth: 1, borderColor: LINE }}>
      {rows.map((row, i) => (
        <View key={`${row.label}-${i}`} style={{ flexDirection: "row", borderTopWidth: i === 0 ? 0 : 1, borderTopColor: LINE }}>
          <View style={{ width: "42%", backgroundColor: "#F3F4F6", paddingVertical: 11, paddingHorizontal: 12 }}>
            <Text style={{ color: "#4B5563", fontSize: 13 }}>{row.label}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#fff", paddingVertical: 11, paddingHorizontal: 12 }}>
            <Text style={{ color: "#111", fontSize: 13, fontWeight: "600" }}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function CommentRow({ review }: { review: Review }) {
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontWeight: "800", color: "#374151" }}>{review.name[0]}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontWeight: "700", fontSize: 13, color: "#111" }}>{review.name}</Text>
          <Text style={{ color: "#9AA0A6", fontSize: 11 }}>{review.time}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons key={n} name="star" size={11} color={n <= review.rating ? "#F5C518" : "#E6E8EC"} />
          ))}
        </View>
      </View>
      <Text style={{ color: "#4B5563", fontSize: 13, lineHeight: 20, marginTop: 8 }}>{review.text}</Text>
    </View>
  );
}
