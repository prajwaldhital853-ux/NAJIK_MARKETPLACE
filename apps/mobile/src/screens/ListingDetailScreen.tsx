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
import { AuthImage } from "../components/AuthImage";
import { classifiedMore, ConditionPill, LINE, ListingGrid, listingTags, postedLabel } from "../components/ClassifiedCard";
import { OsmWebMap } from "../components/OsmWebMap";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { ReportComplaintModal } from "../components/ReportComplaintModal";
import { useAuth } from "../context/AuthContext";
import { isProvider } from "../demo";
import { catalogMeta, listingById, type CatalogItem } from "../data/catalog";
import { liveListingById, listingToCatalog } from "../data/liveListings";
import { fetchListing, postListingComment, postListingReview, toggleListingSave, type ApiListing } from "../listingsApi";
import { emitListingsChanged, subscribeListingsChanged } from "../listingsRefresh";
import { openChatThread } from "../navigation/browse";
import { richFor, type Review } from "../data/listingDetails";
import { friendlyError } from "../api";
import { startListingChat } from "../chatApi";
import { mapsDirectionsUrl } from "../geo";

const GREEN = "#1B7D2C";
const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_H = Math.round(SCREEN_W * 0.72);

type TabKey = "description" | "comments" | "location";

const infoLinks = ["Safety Tips", "Posting Rules", "FAQ", "Terms of Use", "Privacy Policy", "Contact Us", "Report bugs"];

export function ListingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const id = String(route.params?.id ?? "");
  const manage = Boolean(route.params?.manage);
  const [item, setItem] = useState<CatalogItem | undefined>(listingById(id) || liveListingById(id));
  const [live, setLive] = useState<ApiListing | null>(null);

  useEffect(() => {
    const cached = listingById(id) || liveListingById(id);
    if (cached) setItem(cached);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    const load = () => {
      void fetchListing(id)
        .then((row) => {
          setLive(row);
          setItem(listingToCatalog(row));
        })
        .catch(() => {
          if (!cached) setItem(undefined);
        });
    };
    load();
    return subscribeListingsChanged(load);
  }, [id]);

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

  const isOwner = Boolean(live && user?.id && live.owner_id === user.id) || (manage && isProvider(user));

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AppHeader onClose={() => navigation.goBack()} showPro={isOwner} />
      <KeyboardScreen
        contentStyle={{ paddingBottom: 28 }}
        style={{ backgroundColor: "#fff" }}
        onRefresh={async () => {
          if (!/^[0-9a-f-]{36}$/i.test(id)) {
            emitListingsChanged();
            return;
          }
          try {
            const row = await fetchListing(id);
            setLive(row);
            setItem(listingToCatalog(row));
          } catch {
            emitListingsChanged();
          }
        }}
      >
        <ListingBody
          item={item}
          live={live}
          isOwner={isOwner}
          navigation={navigation}
          saved={Boolean(live?.saved_by_me)}
          onSaved={setLive}
        />
      </KeyboardScreen>
    </View>
  );
}

function ListingBody({
  item,
  live,
  isOwner,
  navigation,
  saved,
  onSaved,
}: {
  item: CatalogItem;
  live: ApiListing | null;
  isOwner: boolean;
  navigation: any;
  saved: boolean;
  onSaved: (row: ApiListing) => void;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listingId = live?.id || item.id;
  const meta = catalogMeta[item.key];
  const rich = useMemo(() => richFor(item, live), [item, live]);
  const related: CatalogItem[] = [];
  const galleryRef = useRef<FlatList<number>>(null);
  const [photo, setPhoto] = useState(0);
  const [tab, setTab] = useState<TabKey>("description");
  const [more, setMore] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const marketplace = item.key === "used" || item.key === "electronics";

  useEffect(() => {
    setPhoto(0);
    setTab("description");
    setMore(false);
    setComment("");
    setReviewText("");
    galleryRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [item.id]);

  function onHeroScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== photo && i >= 0 && i < rich.gallery.length) setPhoto(i);
  }

  async function callSeller() {
    const number = live?.contact_phone || rich.seller.phone;
    if (!number) {
      Alert.alert("Call seller", "This listing has no phone number.");
      return;
    }
    const url = `tel:${number}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Call seller", number);
  }

  async function chatSeller() {
    if (!user) {
      Alert.alert("Sign in", "Sign in to chat about this listing.");
      return;
    }
    if (isOwner || (live?.owner_id && live.owner_id === user.id)) {
      Alert.alert("Chat", "This is your listing. Buyers will message you here.");
      return;
    }
    if (!/^[0-9a-f-]{36}$/i.test(listingId)) {
      Alert.alert("Chat", "Chat is available on live listings.");
      return;
    }
    setBusy(true);
    try {
      const thread = await startListingChat(listingId);
      openChatThread(navigation, thread.id);
    } catch (err) {
      Alert.alert("Chat", friendlyError(err, "Could not start chat."));
    } finally {
      setBusy(false);
    }
  }

  async function shareListing() {
    try {
      await Share.share({ message: `${item.title} · ${item.price}\n${item.location}\n${rich.gallery.length} photos on NAJIK` });
    } catch {
      /* cancelled */
    }
  }

  const generalRows = [
    { label: "Category", value: meta.title },
    { label: "Location", value: item.location },
    { label: "Posted", value: item.time },
  ];

  return (
    <>
      {rich.gallery.length ? (
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
              {typeof src === "number" ? (
                <Image source={src} style={{ width: SCREEN_W, height: PHOTO_H, backgroundColor: "#E8EEF0" }} resizeMode="cover" />
              ) : (
                <AuthImage uri={src.uri} style={{ width: SCREEN_W, height: PHOTO_H, backgroundColor: "#E8EEF0" }} />
              )}
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
      ) : null}

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
          {isOwner ? (
            <>
              <PressScale
                onPress={() => navigation.navigate("EditListing", { listingId: item.id })}
                style={{
                  flex: 1,
                  backgroundColor: GREEN,
                  borderRadius: 6,
                  height: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={{ fontWeight: "800", fontSize: 13, color: "#fff" }}>Edit listing</Text>
              </PressScale>
            </>
          ) : (
            <>
              <PressScale
                onPress={() => {
                  if (!live) return;
                  void toggleListingSave(live.id)
                    .then(onSaved)
                    .catch((err) => Alert.alert("Save", err instanceof Error ? err.message : "Sign in to save listings."));
                }}
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
                onPress={() => {
                  if (!busy) void chatSeller();
                }}
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
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#111" />
                <Text style={{ fontWeight: "700", fontSize: 13, color: "#111" }}>{busy ? "Starting…" : "Start a chat"}</Text>
              </PressScale>
            </>
          )}
        </View>
        {!isOwner && marketplace ? (
          <PressScale
            onPress={callSeller}
            style={{
              marginTop: 10,
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
            <Ionicons name="call-outline" size={16} color="#111" />
            <Text style={{ fontWeight: "700", fontSize: 13, color: "#111" }}>Call</Text>
          </PressScale>
        ) : null}
        {isOwner && live?.status === "pending" ? (
          <Text style={{ marginTop: 10, color: "#F59E0B", fontSize: 12, fontWeight: "700" }}>Pending admin approval. Buyers cannot see this listing yet.</Text>
        ) : null}
        {isOwner && live?.has_pending_edit ? (
          <Text style={{ marginTop: 10, color: "#F59E0B", fontSize: 12, fontWeight: "700" }}>Your edit is with NAJIK admin. The live listing stays unchanged until they approve it.</Text>
        ) : null}
        {isOwner && live?.status === "rejected" && live.admin_reason ? (
          <Text style={{ marginTop: 10, color: "#E53935", fontSize: 12, fontWeight: "700" }}>Rejected: {live.admin_reason}</Text>
        ) : null}

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
          const label = key === "description" ? "Description" : key === "comments" ? `Comments (${live?.comment_count || rich.reviews.length})` : "Location";
          return (
            <Pressable key={key} onPress={() => setTab(key)} style={{ paddingHorizontal: 12, paddingTop: 10 }}>
              <Text style={{ fontWeight: on ? "700" : "600", fontSize: 14, color: on ? "#111" : "#9AA0A6" }}>{label}</Text>
              <View style={{ height: 3, width: "100%", backgroundColor: on ? "#111" : "transparent", marginTop: 8 }} />
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() =>
            classifiedMore(item, () => {
              if (isOwner) {
                Alert.alert("Report", "You cannot report your own listing.");
                return;
              }
              if (!user) {
                Alert.alert("Report", "Sign in to report this listing.");
                return;
              }
              if (!/^[0-9a-f-]{36}$/i.test(String(listingId))) {
                Alert.alert("Report", "This demo listing cannot be reported.");
                return;
              }
              setReportOpen(true);
            })
          }
          hitSlop={8}
          style={{ padding: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
        </Pressable>
      </View>

      {tab === "description" ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ color: "#374151", fontSize: 14, lineHeight: 22 }} numberOfLines={more ? undefined : 8}>
            {rich.description}
          </Text>
          {rich.description.length > 180 ? (
            <Pressable onPress={() => setMore((v) => !v)} hitSlop={8} style={{ marginTop: 8 }}>
              <Text style={{ color: GREEN, fontWeight: "700", fontSize: 13 }}>{more ? "Show less" : "Read more"}</Text>
            </Pressable>
          ) : null}

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
          comments={(live?.comments || []).map((row) => ({ name: row.author_name || "Buyer", text: row.text, time: row.created_at }))}
          comment={comment}
          setComment={setComment}
          reviewText={reviewText}
          setReviewText={setReviewText}
          rating={rating}
          setRating={setRating}
          canReview={!isOwner && Boolean(live)}
          onPost={() => {
            if (!live || !comment.trim() || busy) return;
            setBusy(true);
            void postListingComment(live.id, comment.trim())
              .then((row) => {
                onSaved(row);
                setComment("");
              })
              .catch((err) => Alert.alert("Comment", err instanceof Error ? err.message : "Sign in to comment."))
              .finally(() => setBusy(false));
          }}
          onReview={() => {
            if (!live || !reviewText.trim() || busy) return;
            setBusy(true);
            void postListingReview(live.id, rating, reviewText.trim())
              .then((row) => {
                onSaved(row);
                setReviewText("");
              })
              .catch((err) => Alert.alert("Review", err instanceof Error ? err.message : "Sign in to review."))
              .finally(() => setBusy(false));
          }}
        />
      ) : null}

      {tab === "location" ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {item.lat != null && item.lng != null ? (
            <View style={{ height: 220, borderRadius: 14, overflow: "hidden", marginBottom: 12, backgroundColor: "#E8EEF3" }}>
              <OsmWebMap
                mode="browse"
                center={{ lat: item.lat, lng: item.lng }}
                zoom={16}
                markers={[{ id: item.id, lat: item.lat, lng: item.lng, label: item.price, kind: "price" }]}
              />
            </View>
          ) : null}
          <PressScale
            onPress={() => {
              if (item.lat != null && item.lng != null) {
                void Linking.openURL(mapsDirectionsUrl({ lat: item.lat, lng: item.lng }));
                return;
              }
              void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`);
            }}
            style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: LINE, padding: 14 }}
          >
            <Ionicons name="location" size={22} color={GREEN} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: "#111" }}>{item.location}</Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
                {item.lat != null ? "Open directions in Google Maps" : "Address only — seller has not pinned a map point yet"}
              </Text>
            </View>
            <Ionicons name="navigate-outline" size={18} color={GREEN} />
          </PressScale>
        </View>
      ) : null}

      {related.length && !live ? (
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
      <ReportComplaintModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="listing"
        title={item.title}
        listingId={String(listingId)}
      />
    </>
  );
}

function CommentsTab({
  reviews,
  comments,
  comment,
  setComment,
  reviewText,
  setReviewText,
  rating,
  setRating,
  canReview,
  onPost,
  onReview,
}: {
  reviews: Review[];
  comments: { name: string; text: string; time: string }[];
  comment: string;
  setComment: (v: string) => void;
  reviewText: string;
  setReviewText: (v: string) => void;
  rating: number;
  setRating: (v: number) => void;
  canReview: boolean;
  onPost: () => void;
  onReview: () => void;
}) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      {reviews.length === 0 && comments.length === 0 ? (
        <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 12 }}>No comments or reviews yet.</Text>
      ) : null}
      {reviews.map((review) => (
        <CommentRow key={`${review.name}-${review.text}`} review={review} />
      ))}
      {comments.map((row, i) => (
        <View key={`${row.time}-${i}`} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE }}>
          <Text style={{ fontWeight: "700", fontSize: 13 }}>{row.name}</Text>
          <Text style={{ color: "#4B5563", fontSize: 13, marginTop: 6, lineHeight: 20 }}>{row.text}</Text>
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
      {canReview ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Leave a review</Text>
          <View style={{ flexDirection: "row", gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Ionicons name="star" size={20} color={n <= rating ? "#F5C518" : "#E6E8EC"} />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            onFocus={onInputFocus}
            placeholder="How was this listing?"
            placeholderTextColor="#9AA0A6"
            style={{ borderWidth: 1, borderColor: LINE, borderRadius: 6, minHeight: 70, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, textAlignVertical: "top" }}
            multiline
          />
          <PressScale onPress={onReview} style={{ marginTop: 8, backgroundColor: GREEN, height: 44, borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>Submit review</Text>
          </PressScale>
        </View>
      ) : null}
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
