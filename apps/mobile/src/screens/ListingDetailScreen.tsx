import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
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
import { Avatar } from "../components/Avatar";
import { classifiedMore, ConditionPill, LINE, ListingGrid, listingTags, postedLabel, SalePrice, splitPrice } from "../components/ClassifiedCard";
import { OsmWebMap } from "../components/OsmWebMap";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { ReportComplaintModal } from "../components/ReportComplaintModal";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { normTargetId } from "../inboxBridge";
import { isProvider } from "../demo";
import { catalogMeta, listingById, type CatalogItem } from "../data/catalog";
import { apiCategoryForKey, liveListingById, listingsToCatalog, listingToCatalog } from "../data/liveListings";
import { rankSimilarListings, relatedKeywordsFor } from "../data/similarListings";
import { fetchListing, fetchListingFeed, postListingComment, postListingReview, toggleListingSave, type ApiListing } from "../listingsApi";
import { recordListingView } from "../listingViews";
import { emitListingsChanged, subscribeListingsChanged } from "../listingsRefresh";
import { openCategory, openChatThread, openMapSearch, openSellerProfile } from "../navigation/browse";
import { richFor, type Review } from "../data/listingDetails";
import { friendlyError } from "../api";
import { startListingChat } from "../chatApi";
import { mapsDirectionsUrl, mapsPinUrl } from "../geo";

const GREEN = "#1B7D2C";
const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_H = Math.round(SCREEN_W * 0.72);

type TabKey = "description" | "comments" | "location";

const infoLinks = ["Safety Tips", "Posting Rules", "FAQ", "Terms of Use", "Privacy Policy", "Contact Us", "Report bugs"];

export function ListingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { dismissTarget } = useInbox();
  const id = String(route.params?.id ?? "");
  const manage = Boolean(route.params?.manage);
  const [item, setItem] = useState<CatalogItem | undefined>(listingById(id) || liveListingById(id));
  const [live, setLive] = useState<ApiListing | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void dismissTarget({ target: "listing", target_id: normTargetId(id) });
    }, [id, dismissTarget]),
  );

  useEffect(() => {
    const cached = listingById(id) || liveListingById(id);
    if (cached) setItem(cached);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    const load = () => {
      void fetchListing(id)
        .then((row) => {
          setLive(row);
          setItem(listingToCatalog(row));
          void recordListingView(row.id);
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
        adjustKeyboardInsets={true}
        contentStyle={{ paddingBottom: 100 }}
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
  const [related, setRelated] = useState<CatalogItem[]>([]);
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [relatedPool, setRelatedPool] = useState<CatalogItem[]>([]);
  const galleryRef = useRef<FlatList<number>>(null);
  const [photo, setPhoto] = useState(0);
  const [tab, setTab] = useState<TabKey>("description");
  const [more, setMore] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const marketplace = item.key === "used" || item.key === "electronics";

  useEffect(() => {
    setPhoto(0);
    setTab("description");
    setMore(false);
    setComment("");
    setReviewText("");
    setActiveKeyword(null);
    galleryRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [item.id]);

  useEffect(() => {
    const category = live?.category || apiCategoryForKey(item.key);
    const keywords = relatedKeywordsFor(item, live);
    setRelatedKeywords(keywords);
    let cancelled = false;
    void fetchListingFeed({ category })
      .then((rows) => {
        if (cancelled) return;
        const pool = listingsToCatalog(rows).filter((row) => row.id !== item.id);
        setRelatedPool(pool);
        setRelated(rankSimilarListings(pool, item));
      })
      .catch(() => {
        if (!cancelled) {
          setRelatedPool([]);
          setRelated([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, item.key, live?.category, live?.subcategory, item.title]);

  useEffect(() => {
    if (!relatedPool.length) return;
    setRelated(rankSimilarListings(relatedPool, item, { keyword: activeKeyword }));
  }, [activeKeyword, relatedPool, item]);

  function openSellerMap() {
    if (item.lat != null && item.lng != null) {
      void Linking.openURL(mapsPinUrl({ lat: item.lat, lng: item.lng }));
      return;
    }
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`);
  }

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
        {listingTags(item).map((tag, index) => (
          <ConditionPill key={`${tag}-${index}`} label={tag} />
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ fontWeight: "800", fontSize: 22, color: "#111", lineHeight: 28 }}>{item.title}</Text>
        <View style={{ marginTop: 8 }}>
          <SalePrice amount={splitPrice(item.price).amount} unit={splitPrice(item.price).unit} originalPrice={item.originalPrice} discountPercent={item.discountPercent} />
        </View>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 6 }}>{postedLabel(item.time)}</Text>
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: LINE, padding: 14 }}>
        <Pressable
          onPress={() => rich.seller.ownerId && openSellerProfile(navigation, rich.seller.ownerId)}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Avatar name={rich.seller.name} uri={rich.seller.photoUrl} size={44} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontWeight: "700", fontSize: 14, color: "#111" }}>{rich.seller.name}</Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{rich.seller.role}</Text>
            <Pressable onPress={callSeller}>
              <Text style={{ color: GREEN, fontSize: 13, marginTop: 4 }}>{rich.seller.phone}</Text>
            </Pressable>
          </View>
          <View style={{ backgroundColor: "#EFEFEF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 }}>
            <Text style={{ fontWeight: "700", fontSize: 12, color: "#374151" }}>{live?.review_count || rich.reviewCount} reviews</Text>
          </View>
        </Pressable>
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
          const label = key === "description" ? "Description" : key === "comments" ? `Comments (${(live?.comment_count || 0) + (live?.review_count || rich.reviewCount || 0)})` : "Location";
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

          {rich.highlights.map((row, index) => (
            <View key={`${row}-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
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
          comments={live?.comments || []}
          comment={comment}
          setComment={setComment}
          reviewText={reviewText}
          setReviewText={setReviewText}
          rating={rating}
          setRating={setRating}
          canReview={!isOwner && Boolean(live)}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          commentBusy={commentBusy}
          reviewBusy={reviewBusy}
          isOwner={isOwner}
          onPost={() => {
            if (!live || !comment.trim() || commentBusy) return;
            setCommentBusy(true);
            void postListingComment(live.id, comment.trim(), replyTo?.id)
              .then((row) => {
                onSaved(row);
                setComment("");
                setReplyTo(null);
              })
              .catch((err) => Alert.alert("Comment", err instanceof Error ? err.message : "Sign in to comment."))
              .finally(() => setCommentBusy(false));
          }}
          onReview={() => {
            if (!live || reviewBusy) return;
            setReviewBusy(true);
            void postListingReview(live.id, rating, reviewText.trim())
              .then((row) => {
                onSaved(row);
                setReviewText("");
              })
              .catch((err) => Alert.alert("Review", err instanceof Error ? err.message : "Sign in to rate this seller."))
              .finally(() => setReviewBusy(false));
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
                onSelect={() => openSellerMap()}
              />
              <PressScale
                onPress={openSellerMap}
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  bottom: 10,
                  backgroundColor: "rgba(11,29,42,0.88)",
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="map" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12, flex: 1 }}>Open pinned location in Google Maps</Text>
                <Ionicons name="open-outline" size={14} color="#fff" />
              </PressScale>
            </View>
          ) : (
            <View style={{ backgroundColor: "#F3F4F6", borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <Text style={{ color: "#6B7280", fontSize: 13, textAlign: "center" }}>
                Seller has not pinned a map location for this listing yet.
              </Text>
            </View>
          )}
          <PressScale
            onPress={() => {
              if (item.lat != null && item.lng != null) {
                void Linking.openURL(mapsDirectionsUrl({ lat: item.lat, lng: item.lng }));
                return;
              }
              openSellerMap();
            }}
            style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: LINE, padding: 14, borderRadius: 12 }}
          >
            <Ionicons name="location" size={22} color={GREEN} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: "#111" }}>{item.location}</Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
                {item.lat != null ? "Open directions in Google Maps" : "Search this address in Google Maps"}
              </Text>
            </View>
            <Ionicons name="navigate-outline" size={18} color={GREEN} />
          </PressScale>
        </View>
      ) : null}

      {(related.length || relatedKeywords.length) && !isOwner ? (
        <View style={{ paddingTop: 22, paddingBottom: 4, paddingHorizontal: 16 }}>
          <Text style={{ fontWeight: "900", fontSize: 18, color: "#111827", marginBottom: 10 }}>
            Similar {meta.title}
          </Text>

          {relatedKeywords.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              <PressScale
                onPress={() => setActiveKeyword(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: !activeKeyword ? GREEN : "#EEF0F3",
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 12, color: !activeKeyword ? "#fff" : "#374151" }}>All related</Text>
              </PressScale>
              {relatedKeywords.map((kw, index) => {
                const on = activeKeyword === kw;
                return (
                  <PressScale
                    key={`${kw}-${index}`}
                    onPress={() => setActiveKeyword(on ? null : kw)}
                    onLongPress={() => openMapSearch(navigation, { q: kw, key: item.key })}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? GREEN : "#E5E7EB",
                      backgroundColor: on ? "#E7F6EC" : "#fff",
                    }}
                  >
                    <Text style={{ fontWeight: "700", fontSize: 12, color: on ? GREEN : "#374151" }}>{kw}</Text>
                  </PressScale>
                );
              })}
            </ScrollView>
          ) : null}

          {related.length ? (
            <ListingGrid items={related} />
          ) : (
            <View style={{ backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14 }}>
              <Text style={{ color: "#6B7280", fontSize: 13, textAlign: "center" }}>
                No matches for “{activeKeyword}”. Try another related keyword.
              </Text>
            </View>
          )}

          <PressScale
            onPress={() => {
              if (activeKeyword) {
                openMapSearch(navigation, { q: activeKeyword, key: item.key });
                return;
              }
              openCategory(navigation, item.key);
            }}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              borderWidth: 1.5,
              borderColor: "#2563EB",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 12 }}>
              {activeKeyword ? `View more “${activeKeyword}”` : `View more ${meta.title}`}
            </Text>
          </PressScale>
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
  replyTo,
  setReplyTo,
  commentBusy,
  reviewBusy,
  isOwner,
  onPost,
  onReview,
}: {
  reviews: Review[];
  comments: ApiListing["comments"];
  comment: string;
  setComment: (v: string) => void;
  reviewText: string;
  setReviewText: (v: string) => void;
  rating: number;
  setRating: (v: number) => void;
  canReview: boolean;
  replyTo: { id: string; name: string } | null;
  setReplyTo: (v: { id: string; name: string } | null) => void;
  commentBusy: boolean;
  reviewBusy: boolean;
  isOwner: boolean;
  onPost: () => void;
  onReview: () => void;
}) {
  const { onInputFocus, scrollAnchorIntoView } = useKeyboardScroll();
  const formRef = useRef<View>(null);
  const replyCount = comments.reduce((sum, row) => sum + (row.replies?.length || 0), 0);
  const total = reviews.length + comments.length + replyCount;
  const scrollable = total > 6;

  function focusCommentField() {
    onInputFocus();
    scrollAnchorIntoView(formRef.current);
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      {total === 0 ? (
        <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 12 }}>No comments or reviews yet.</Text>
      ) : (
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={scrollable} style={{ maxHeight: scrollable ? 360 : undefined }} contentContainerStyle={{ paddingBottom: 4 }}>
          {reviews.map((review) => (
            <CommentRow key={`${review.name}-${review.text}`} review={review} />
          ))}
          {comments.map((row) => (
            <View key={row.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE }}>
              <Text style={{ fontWeight: "700", fontSize: 13 }}>{row.author_name || "User"}</Text>
              <Text style={{ color: "#4B5563", fontSize: 13, marginTop: 6, lineHeight: 20 }}>{row.text}</Text>
              <Pressable onPress={() => setReplyTo({ id: row.id, name: row.author_name || "User" })} style={{ marginTop: 6 }}>
                <Text style={{ color: GREEN, fontWeight: "700", fontSize: 12 }}>Reply</Text>
              </Pressable>
              {(row.replies || []).map((reply) => (
                <View key={reply.id} style={{ marginTop: 10, marginLeft: 14, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#E5E7EB" }}>
                  <Text style={{ fontWeight: "700", fontSize: 12 }}>{reply.author_name}</Text>
                  <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 4, lineHeight: 18 }}>{reply.text}</Text>
                  <Pressable onPress={() => setReplyTo({ id: row.id, name: reply.author_name })} style={{ marginTop: 4 }}>
                    <Text style={{ color: GREEN, fontWeight: "700", fontSize: 11 }}>Reply</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
      {replyTo ? (
        <Pressable onPress={() => setReplyTo(null)} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>Replying to {replyTo.name}</Text>
          <Text style={{ color: GREEN, fontWeight: "700", fontSize: 12 }}>Cancel</Text>
        </Pressable>
      ) : null}
      <View ref={formRef} collapsable={false} style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 }}>
        <TextInput
          value={comment}
          onChangeText={setComment}
          onFocus={focusCommentField}
          placeholder={isOwner ? "Reply to a buyer…" : "Write a comment…"}
          placeholderTextColor="#9AA0A6"
          style={{ flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, height: 44, paddingHorizontal: 12, fontSize: 13 }}
        />
        <PressScale
          onPress={onPost}
          style={{ backgroundColor: GREEN, height: 44, paddingHorizontal: 14, borderRadius: 6, alignItems: "center", justifyContent: "center", minWidth: 72, opacity: commentBusy ? 0.7 : 1 }}
        >
          {commentBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Post</Text>}
        </PressScale>
      </View>
      {canReview ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Rate this seller</Text>
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
            onFocus={focusCommentField}
            placeholder="Optional note about this seller"
            placeholderTextColor="#9AA0A6"
            style={{ borderWidth: 1, borderColor: LINE, borderRadius: 6, minHeight: 70, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, textAlignVertical: "top" }}
            multiline
          />
          <PressScale
            onPress={onReview}
            style={{ marginTop: 8, backgroundColor: GREEN, height: 44, borderRadius: 6, alignItems: "center", justifyContent: "center", opacity: reviewBusy ? 0.7 : 1 }}
          >
            {reviewBusy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Submit rating</Text>}
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
