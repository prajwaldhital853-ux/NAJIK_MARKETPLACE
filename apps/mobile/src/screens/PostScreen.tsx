import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { compressPhotoAsset } from "../pickPhoto";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Alert, ActivityIndicator, Image, Keyboard, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../components/AppHeader";
import { AuthImage } from "../components/AuthImage";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { FormToast } from "../components/FormToast";
import { OsmWebMap } from "../components/OsmWebMap";
import { searchPlaces, LAHAN, requestUserPoint, reverseGeocode, type PlaceHit } from "../geo";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { CONTACT_OPTIONS } from "../data/listingCategories";
import {
  JOB_EXPERIENCE,
  KIND_CARDS,
  SERVICE_RATE,
  TYPE_OPTIONS,
  VEHICLE_FUEL,
  VERTICAL_COPY,
  VERTICAL_DEFAULTS,
  VERTICAL_FEATURES,
  verticalForService,
  verticalFromCategory,
  type ListingVertical,
} from "../data/listingVertical";
import { canPostServices, isProvider } from "../demo";
import { createListing, fetchMyListings, updateListing } from "../listingsApi";
import { fetchSellerPaymentsMe, type SellerPaymentConfig } from "../paymentsApi";
import { formatFeeBand, quoteListingFeeRupees } from "../listingFee";
import { openSellerPage } from "../navigation/browse";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";
const houseArt = require("../../assets/hero/house.png");

const STEPS = [
  { key: "Basic Info", next: "Details", icon: "home" as const },
  { key: "Details", next: "Pricing", icon: "document-text-outline" as const },
  { key: "Pricing", next: "Media", icon: "pricetag-outline" as const },
  { key: "Media", next: "Review", icon: "image-outline" as const },
  { key: "Review", next: "Submit", icon: "eye-outline" as const },
];

type FieldKey = "title" | "location" | "pin" | "description" | "phone";

export function PostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listingId = route.params?.listingId as string | undefined;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { onInputFocus } = useKeyboardScroll();
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const vertical: ListingVertical = listingId && editCategory ? verticalFromCategory(editCategory) : verticalForService(user?.service_type);
  const copy = VERTICAL_COPY[vertical];
  const kindCards = KIND_CARDS[vertical];
  const types = TYPE_OPTIONS[vertical];
  const showTypePicker = vertical === "property" || vertical === "jobs" || vertical === "vehicles" || vertical === "marketplace";
  const defaults = VERTICAL_DEFAULTS[vertical];

  const [step, setStep] = useState(0);
  const [dealType, setDealType] = useState(defaults.deal);
  const [propertyType, setPropertyType] = useState(defaults.type);
  const [typeOpen, setTypeOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [discountPct, setDiscountPct] = useState("");
  const [soldFlag, setSoldFlag] = useState(false);
  const [city, setCity] = useState("Kathmandu");
  const [district, setDistrict] = useState("Kathmandu");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [placeHits, setPlaceHits] = useState<PlaceHit[]>([]);
  const skipGeocode = useRef(false);
  const [contactName, setContactName] = useState(user?.full_name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactVia, setContactVia] = useState("phone");
  const [beds, setBeds] = useState("3");
  const [baths, setBaths] = useState("2");
  const [kitchens, setKitchens] = useState("1");
  const [parking, setParking] = useState(true);
  const [area, setArea] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [company, setCompany] = useState("");
  const [experience, setExperience] = useState("Entry level");
  const [applyEmail, setApplyEmail] = useState(user?.email || "");
  const [year, setYear] = useState("");
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState("Petrol");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [rateType, setRateType] = useState("Per visit");
  const [availability, setAvailability] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [customFeature, setCustomFeature] = useState("");
  const [promote, setPromote] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<FieldKey | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, View | null>>>({});
  const [busy, setBusy] = useState(false);
  const [keepPhotos, setKeepPhotos] = useState(true);
  const [payConfig, setPayConfig] = useState<SellerPaymentConfig | null>(null);
  const [walletPaisa, setWalletPaisa] = useState(0);
  const [walletLabel, setWalletLabel] = useState("Rs. 0");
  const [quotedFeeRupees, setQuotedFeeRupees] = useState<number | null>(null);

  const listingPriceRupees = Number(String(price).replace(/\D/g, "") || 0);
  const listingFeeRupees =
    quotedFeeRupees != null ? quotedFeeRupees : quoteListingFeeRupees(listingPriceRupees, payConfig);
  const listingFeeLabel = listingFeeRupees > 0 ? `Rs. ${listingFeeRupees.toLocaleString("en-IN")}` : "Free";
  const listingFeePaisa = listingFeeRupees * 100;
  const walletShort = isProvider(user) && listingFeeRupees > 0 && walletPaisa < listingFeePaisa;

  const loadPayments = useCallback(
    (priceHint?: number) => {
      if (!isProvider(user)) return;
      void fetchSellerPaymentsMe(priceHint)
        .then((pay) => {
          setPayConfig(pay.config);
          setWalletPaisa(pay.balance_paisa || 0);
          setWalletLabel(pay.balance_label || "Rs. 0");
          if (typeof pay.quoted_listing_fee_rupees === "number") {
            setQuotedFeeRupees(pay.quoted_listing_fee_rupees);
          } else {
            setQuotedFeeRupees(quoteListingFeeRupees(priceHint ?? listingPriceRupees, pay.config));
          }
        })
        .catch(() => {});
    },
    [user?.id, listingPriceRupees],
  );

  useFocusEffect(
    useCallback(() => {
      loadPayments(listingPriceRupees);
    }, [loadPayments, listingPriceRupees]),
  );

  useEffect(() => {
    if (!isProvider(user)) return;
    const timer = setTimeout(() => loadPayments(listingPriceRupees), 300);
    return () => clearTimeout(timer);
  }, [listingPriceRupees, loadPayments, user?.id]);

  useEffect(() => {
    if (listingId) return;
    const next = VERTICAL_DEFAULTS[vertical];
    setDealType(next.deal);
    setPropertyType(next.type);
  }, [vertical, listingId]);

  useEffect(() => {
    if (!listingId) return;
    void fetchMyListings()
      .then((rows) => {
        const row = rows.find((item) => item.id === listingId);
        if (!row) return;
        setEditCategory(row.category);
        const loaded = verticalFromCategory(row.category);
        const fallback = VERTICAL_DEFAULTS[loaded];
        setDealType(String(row.extras?.dealType || fallback.deal));
        setPropertyType(row.subcategory || fallback.type);
        setTitle(row.title || "");
        setDescription(row.description || "");
        setPrice(String(row.price || "").replace(/\D/g, "") || String(row.price || ""));
        setNegotiable(Boolean(row.negotiable));
        const disc = Number(row.extras?.discountPercent ?? row.extras?.discount_percent ?? 0);
        setDiscountPct(disc > 0 ? String(disc) : "");
        setSoldFlag(String(row.extras?.sold) === "true" || row.extras?.sold === true);
        setCity(row.city || "Kathmandu");
        setDistrict(row.district || "Kathmandu");
        setLocation(row.location || "");
        setLat(row.lat ?? null);
        setLng(row.lng ?? null);
        setContactName(row.contact_name || user?.full_name || "");
        setContactPhone(row.contact_phone || user?.phone || "");
        setContactEmail(row.contact_email || user?.email || "");
        setContactVia(row.contact_via || "phone");
        setBeds(String(row.extras?.beds || "0"));
        setBaths(String(row.extras?.baths || "0"));
        setKitchens(String(row.extras?.kitchens || "0"));
        setParking(Boolean(row.extras?.parking));
        setArea(String(row.extras?.area || ""));
        setFurnished(Boolean(row.extras?.furnished));
        setCompany(String(row.extras?.company || ""));
        setExperience(String(row.extras?.experience || "Entry level"));
        setApplyEmail(String(row.extras?.applyEmail || row.contact_email || ""));
        setYear(String(row.extras?.year || ""));
        setKm(String(row.extras?.km || ""));
        setFuel(String(row.extras?.fuel || "Petrol"));
        setMake(String(row.extras?.make || ""));
        setModel(String(row.extras?.model || ""));
        setRateType(String(row.extras?.rateType || "Per visit"));
        setAvailability(String(row.extras?.availability || ""));
        setFeatures(Array.isArray(row.extras?.features) ? row.extras.features.map(String) : []);
        setPromote(Boolean(row.promote_requested));
        setPhotos(row.photos.map((photo) => photo.url));
        setKeepPhotos(true);
      })
      .catch(() => undefined);
  }, [listingId, user?.email, user?.full_name, user?.phone]);

  const nextLabel = useMemo(() => {
    if (step === 4) return promote ? "Submit & promote" : "Submit listing";
    return `Next: ${STEPS[step].next}`;
  }, [step, promote]);

  useEffect(() => {
    if (skipGeocode.current) {
      skipGeocode.current = false;
      return;
    }
    const text = location.trim();
    if (text.length < 2) {
      setPlaceHits([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchPlaces(text, 12).then(setPlaceHits);
    }, 280);
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (isProvider(user) && !canPostServices(user)) {
    const rejected = user?.verification_status === "rejected";
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader right="draft" showPro onClose={() => navigation.jumpTo("Home")} />
        <View style={{ padding: 24, alignItems: "center" }}>
          <Ionicons name={rejected ? "close-circle-outline" : "time-outline"} size={48} color={rejected ? colors.red : colors.orange} />
          <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 12, textAlign: "center" }}>
            {rejected ? "Application not approved" : "Waiting for admin verification"}
          </Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 8 }}>
            {rejected
              ? "NAJIK admin rejected this seller account. You cannot post listings yet."
              : "You cannot post listings until NAJIK admin verifies your nagrita, photo and details."}
          </Text>
        </View>
      </View>
    );
  }

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }

  function clearFieldError(field?: FieldKey) {
    if (!field || errorField === field) {
      setErrorField(null);
      setError("");
    }
  }

  function bindFieldRef(key: FieldKey, ref: View | null) {
    fieldRefs.current[key] = ref;
  }

  function reportError(result: { field: FieldKey; message: string }) {
    setError(result.message);
    setErrorField(result.field);
    setErrorTick((value) => value + 1);
    showToast(result.message);
  }

  function validateAt(index: number): { field: FieldKey; message: string } | null {
    if (index === 0) {
      if (!title.trim()) return { field: "title", message: `Add a ${copy.titleLabel.toLowerCase()}.` };
      if (!location.trim()) return { field: "location", message: "Enter the listing location." };
      if (lat == null || lng == null) return { field: "pin", message: "Pin the exact location on the map." };
      if (!description.trim()) return { field: "description", message: "Add a short description." };
    }
    if (index === 1 && !contactPhone.replace(/\s/g, "")) return { field: "phone", message: "Enter a contact phone number." };
    return null;
  }

  async function applyPin(point: { lat: number; lng: number }, geocode = true) {
    skipGeocode.current = true;
    setLat(point.lat);
    setLng(point.lng);
    clearFieldError("pin");
    if (!geocode) return;
    try {
      const geo = await reverseGeocode(point);
      if (geo.location) {
        setLocation(geo.location);
        clearFieldError("location");
      }
      if (geo.city) setCity(geo.city);
      if (geo.district) setDistrict(geo.district);
    } catch {
      return;
    }
  }

  async function useCurrentLocation() {
    if (locBusy) return;
    setLocBusy(true);
    try {
      const point = await requestUserPoint();
      if (!point) {
        Alert.alert("Location", "Allow location access to pin your listing, or search and pick a place below.");
        return;
      }
      await applyPin(point);
    } finally {
      setLocBusy(false);
    }
  }

  function pickSuggestedPlace(hit: PlaceHit) {
    skipGeocode.current = true;
    setPlaceHits([]);
    setLocation(hit.location || hit.label);
    setLat(hit.lat);
    setLng(hit.lng);
    if (hit.city) setCity(hit.city);
    if (hit.district) setDistrict(hit.district);
  }
  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photos so you can add listing pictures.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
      base64: false,
      selectionLimit: 8,
    });
    if (result.canceled) return;
    setUploading(true);
    setUploadPct(8);
    const next: string[] = [];
    const assets = result.assets.slice(0, 8);
    for (let i = 0; i < assets.length; i += 1) {
      const asset = assets[i];
      const dataUri = await compressPhotoAsset(asset);
      if (!dataUri) continue;
      next.push(dataUri);
      setUploadPct(Math.round(((i + 1) / assets.length) * 100));
    }
    setPhotos(next);
    setKeepPhotos(false);
    setUploading(false);
  }

  function extrasPayload() {
    const featureTags = features.filter(Boolean);
    const pct = Math.min(90, Math.max(0, Number(String(discountPct).replace(/\D/g, "") || 0)));
    const shared = {
      dealType,
      features: featureTags,
      ...(pct ? { discountPercent: pct } : { discountPercent: 0 }),
      ...(soldFlag ? { sold: true } : {}),
    };
    if (vertical === "jobs") {
      return { ...shared, company, experience, applyEmail, workplace: propertyType };
    }
    if (vertical === "vehicles") {
      return { ...shared, year, km, fuel, make, model };
    }
    if (vertical === "services" || vertical === "nearby") {
      return { ...shared, rateType, availability };
    }
    if (vertical === "marketplace") {
      return { ...shared, condition: dealType };
    }
    return { ...shared, beds, baths, kitchens, parking, area, furnished };
  }

  function payload(publish: boolean) {
    return {
      category: vertical,
      subcategory: propertyType,
      title: title.trim(),
      description: description.trim(),
      price: price.replace(/\D/g, ""),
      negotiable,
      location: location.trim(),
      city,
      district,
      lat,
      lng,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.replace(/\s/g, ""),
      contact_email: (applyEmail || contactEmail).trim(),
      contact_via: contactVia,
      extras: extrasPayload(),
      ...(listingId && keepPhotos ? {} : { photos }),
      promote,
      publish,
    };
  }

  async function save(publish: boolean) {
    if (publish) {
      for (let index = 0; index < 4; index += 1) {
        const result = validateAt(index);
        if (result) {
          setStep(index);
          reportError(result);
          return;
        }
      }
    } else if (!title.trim()) {
      setStep(0);
      reportError({ field: "title", message: "Add a title before saving a draft." });
      return;
    }
    setBusy(true);
    setError("");
    setErrorField(null);
    try {
      if (publish) {
        const priceDigits = Number(String(price).replace(/\D/g, "") || 0);
        const pay = await fetchSellerPaymentsMe(priceDigits).catch(() => null);
        const fee =
          typeof pay?.quoted_listing_fee_rupees === "number"
            ? pay.quoted_listing_fee_rupees
            : quoteListingFeeRupees(priceDigits, pay?.config);
        const balance = pay?.balance_paisa ?? walletPaisa;
        if (fee > 0 && balance < fee * 100) {
          const msg = `Insufficient balance (${pay?.balance_label ?? walletLabel}). Publishing this Rs. ${Number(String(price).replace(/\D/g, "") || 0).toLocaleString("en-IN")} listing costs Rs. ${fee.toLocaleString("en-IN")}. Add funds in Payments first, or save as draft.`;
          setError(msg);
          showToast(msg);
          setBusy(false);
          return;
        }
      }
      const row = listingId ? await updateListing(listingId, payload(publish)) : await createListing(payload(publish));
      Alert.alert(
        publish ? "Listing published" : "Draft saved",
        publish
          ? "Your listing is live in the marketplace feed. Buyers can see it right away."
          : "You can edit and publish this listing later.",
        [{ text: "My listings", onPress: () => (isProvider(user) ? navigation.navigate("Tabs", { screen: "Listings" }) : navigation.jumpTo("Home")) }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save this listing.";
      setError(message);
      showToast(message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    Keyboard.dismiss();
    const result = validateAt(step);
    if (result) {
      reportError(result);
      return;
    }
    setError("");
    setErrorField(null);
    if (step === 2 && walletShort) {
      const msg = `Your wallet (${walletLabel}) is less than the listing charge (${listingFeeLabel}). Add balance before continuing.`;
      setError(msg);
      showToast(msg);
      return;
    }
    if (step < 4) setStep((value) => value + 1);
    else void save(true);
  }

  function back() {
    if (step === 0) listingId ? navigation.goBack() : navigation.jumpTo("Home");
    else setStep(step - 1);
  }

  function addFeature(label: string) {
    const value = label.trim();
    if (!value) return;
    setFeatures((current) => (current.includes(value) ? current : [...current, value]));
    setCustomFeature("");
    setAddFeatureOpen(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AppHeader
        right="draft"
        showPro={isProvider(user)}
        onClose={back}
        onDraft={() => void save(false)}
      />
      <View style={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8 }}>
        <View style={{ position: "absolute", left: 28, right: 28, top: 18, height: 2, backgroundColor: "#E6E8EC" }} />
        <View style={{ position: "absolute", left: 28, width: `${(step / 4) * 72}%`, top: 18, height: 2, backgroundColor: GREEN }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {STEPS.map((item, index) => {
            const on = index === step;
            const done = index < step;
            return (
              <PressScale key={item.key} onPress={() => index <= step && setStep(index)} style={{ alignItems: "center", width: 62 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: on || done ? GREEN : "#fff",
                    borderWidth: 1.5,
                    borderColor: on || done ? GREEN : "#D1D5DB",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={done && !on ? "checkmark" : item.icon} size={14} color={on || done ? "#fff" : "#9AA0A6"} />
                </View>
                <Text style={{ marginTop: 4, fontSize: 9, fontWeight: on ? "800" : "600", color: on ? GREEN : "#6B7280" }} numberOfLines={1}>
                  {item.key}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      <KeyboardScreen key={`post-step-${step}`} style={{ backgroundColor: "#fff" }} contentStyle={{ padding: 16, paddingBottom: 28 }}>
        <ErrorScrollHelper errorField={errorField} errorTick={errorTick} fieldRefs={fieldRefs} />
        {step === 0 ? (
          <View>
            <View
              style={{
                backgroundColor: "#E7F6EC",
                borderRadius: 16,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <Image source={houseArt} style={{ width: 72, height: 56, resizeMode: "contain" }} />
              <Text style={{ flex: 1, fontWeight: "800", color: colors.navy, fontSize: 14, lineHeight: 20 }}>{copy.banner}</Text>
              <View style={{ backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ color: GREEN, fontWeight: "800", fontSize: 10 }}>Pro Tips</Text>
              </View>
            </View>

            <Text style={{ fontWeight: "800", color: colors.navy, marginBottom: 10 }}>{copy.kindLabel}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {kindCards.map((item) => {
                const on = dealType === item.key;
                return (
                  <PressScale
                    key={item.key}
                    onPress={() => {
                      setDealType(item.key);
                      if (vertical === "services" || vertical === "nearby") setPropertyType(item.key);
                      else if (vertical === "marketplace") setPropertyType(propertyType || types[0]?.key || defaults.type);
                      else setPropertyType(types[0]?.key || defaults.type);
                    }}
                    style={{
                      flexGrow: 1,
                      flexBasis: kindCards.length > 2 ? "22%" : "46%",
                      minHeight: 86,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: on ? GREEN : "#E6E8EC",
                      backgroundColor: on ? "#F3FBF5" : "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                    }}
                  >
                    {on ? (
                      <View style={{ position: "absolute", top: 6, right: 6 }}>
                        <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                      </View>
                    ) : null}
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text style={{ marginTop: 6, fontWeight: "800", fontSize: 11, color: colors.navy, textAlign: "center" }}>{item.key}</Text>
                  </PressScale>
                );
              })}
            </View>

            {showTypePicker ? (
              <>
                <Text style={{ fontWeight: "700", marginBottom: 6 }}>{copy.typeLabel}</Text>
                <PressScale
                  onPress={() => setTypeOpen(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#E6E8EC",
                    borderRadius: 12,
                    minHeight: 50,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#fff",
                  }}
                >
                  <Ionicons name={types.find((item) => item.key === propertyType)?.icon || "home-outline"} size={16} color={GREEN} />
                  <Text style={{ flex: 1, marginLeft: 8, fontWeight: "700", color: colors.navy }}>{propertyType}</Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </PressScale>
              </>
            ) : null}

            <View
              ref={(node) => bindFieldRef("title", node)}
              style={{ marginTop: 14 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700" }}>{copy.titleLabel}</Text>
                <Text style={{ color: title.length > 60 ? colors.red : "#9AA0A6", fontSize: 11 }}>{title.length}/60</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2, marginBottom: 6 }}>{copy.titleHint}</Text>
              <TextInput
                value={title}
                onChangeText={(value) => {
                  setTitle(value.slice(0, 60));
                  clearFieldError("title");
                }}
                onFocus={onInputFocus}
                placeholder={copy.titlePlaceholder}
                placeholderTextColor="#9AA0A6"
                maxLength={60}
                style={[inputStyle, errorField === "title" ? invalidStyle : null]}
              />
            </View>

            <View ref={(node) => bindFieldRef("location", node)} style={{ marginTop: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700" }}>{vertical === "jobs" ? "Job location" : "Location"}</Text>
                <PressScale onPress={useCurrentLocation} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {locBusy ? <ActivityIndicator size="small" color={GREEN} /> : <Ionicons name="navigate" size={13} color={GREEN} />}
                  <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{locBusy ? "Finding you..." : "Use current location"}</Text>
                </PressScale>
              </View>
              <TextInput
                value={location}
                onChangeText={(value) => {
                  setLocation(value);
                  clearFieldError("location");
                }}
                onFocus={onInputFocus}
                placeholder="Shantinagar, New Baneshwor, Ward 31..."
                placeholderTextColor="#9AA0A6"
                style={[inputStyle, { marginTop: 6 }, errorField === "location" ? invalidStyle : null]}
              />
              {placeHits.length ? (
                <View style={{ marginTop: 6, borderWidth: 1, borderColor: "#E6E8EC", borderRadius: 12, backgroundColor: "#fff", overflow: "hidden" }}>
                  {placeHits.map((hit) => (
                    <PressScale
                      key={`${hit.lat}-${hit.lng}-${hit.label}`}
                      onPress={() => pickSuggestedPlace(hit)}
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
                    >
                      <Text style={{ fontWeight: "700", fontSize: 13 }}>{hit.label}</Text>
                      <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                        {hit.location}
                      </Text>
                    </PressScale>
                  ))}
                </View>
              ) : null}
              <View
                ref={(node) => bindFieldRef("pin", node)}
                style={{
                  marginTop: 10,
                  height: 180,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: "#E8EEF3",
                  borderWidth: errorField === "pin" ? 1.6 : 0,
                  borderColor: colors.red,
                }}
              >
                <OsmWebMap
                  mode="pick"
                  center={lat != null && lng != null ? { lat, lng } : LAHAN}
                  zoom={15}
                  pin={lat != null && lng != null ? { lat, lng } : LAHAN}
                  onPin={(point) => {
                    clearFieldError("pin");
                    void applyPin(point);
                  }}
                />
                <View style={{ position: "absolute", left: 8, right: 8, bottom: 8, flexDirection: "row", gap: 8 }}>
                  <PressScale
                    onPress={() => setMapOpen(true)}
                    style={{ flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingVertical: 8, alignItems: "center" }}
                  >
                    <Text style={{ fontWeight: "800", fontSize: 11, color: GREEN }}>Move pin on map</Text>
                  </PressScale>
                </View>
              </View>
              <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 6 }}>
                {lat != null && lng != null ? `Pinned ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Tap the map to drop your exact pin."}
              </Text>
            </View>

            <View ref={(node) => bindFieldRef("description", node)} style={{ marginTop: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700" }}>{copy.descLabel}</Text>
                <Text style={{ color: description.length > 1000 ? colors.red : "#9AA0A6", fontSize: 11 }}>{description.length}/1000</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={(value) => {
                  setDescription(value.slice(0, 1000));
                  clearFieldError("description");
                }}
                onFocus={onInputFocus}
                placeholder={copy.descPlaceholder}
                placeholderTextColor="#9AA0A6"
                multiline
                maxLength={1000}
                style={[inputStyle, { minHeight: 110, textAlignVertical: "top", marginTop: 6 }, errorField === "description" ? invalidStyle : null]}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {features.map((item, index) => (
                  <PressScale
                    key={`${item}-${index}`}
                    onPress={() => setFeatures((current) => current.filter((value) => value !== item))}
                    style={{
                      backgroundColor: "#E7F6EC",
                      borderRadius: 16,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="pricetag-outline" size={12} color={GREEN} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.navy }}>{item}</Text>
                    <Ionicons name="close" size={12} color="#6B7280" />
                  </PressScale>
                ))}
                <PressScale
                  onPress={() => setAddFeatureOpen(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: GREEN,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: GREEN, fontWeight: "800", fontSize: 11 }}>+ {copy.featureLabel}</Text>
                </PressScale>
              </View>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View>
            {vertical === "property" ? (
              <>
                <Counter label="Bedrooms" value={beds} onChange={setBeds} />
                <Counter label="Bathrooms" value={baths} onChange={setBaths} />
                <Counter label="Kitchens" value={kitchens} onChange={setKitchens} />
                <Field label="Area (sqft)" value={area} onChangeText={setArea} onFocus={onInputFocus} placeholder="1200" keyboardType="number-pad" />
                <PressScale
                  onPress={() => setParking((value) => !value)}
                  style={[toggleStyle, { backgroundColor: parking ? "#E4F6EA" : "#fff", borderColor: parking ? GREEN : colors.border }]}
                >
                  <Ionicons name={parking ? "checkbox" : "square-outline"} size={20} color={GREEN} />
                  <Text style={{ fontWeight: "700" }}>Car parking available</Text>
                </PressScale>
                <PressScale
                  onPress={() => setFurnished((value) => !value)}
                  style={[toggleStyle, { backgroundColor: furnished ? "#E4F6EA" : "#fff", borderColor: furnished ? GREEN : colors.border }]}
                >
                  <Ionicons name={furnished ? "checkbox" : "square-outline"} size={20} color={GREEN} />
                  <Text style={{ fontWeight: "700" }}>Furnished</Text>
                </PressScale>
              </>
            ) : null}
            {vertical === "jobs" ? (
              <>
                <Field label="Company name" value={company} onChangeText={setCompany} onFocus={onInputFocus} placeholder="NAJIK Services Pvt. Ltd." />
                <Text style={{ fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Experience level</Text>
                <ChipRow options={JOB_EXPERIENCE} value={experience} onChange={setExperience} />
                <Field label="Apply email" value={applyEmail} onChangeText={setApplyEmail} onFocus={onInputFocus} placeholder="jobs@company.com" />
              </>
            ) : null}
            {vertical === "vehicles" ? (
              <>
                <Field label="Make" value={make} onChangeText={setMake} onFocus={onInputFocus} placeholder="Hyundai" />
                <Field label="Model" value={model} onChangeText={setModel} onFocus={onInputFocus} placeholder="Creta" />
                <Field label="Year" value={year} onChangeText={setYear} onFocus={onInputFocus} placeholder="2022" keyboardType="number-pad" />
                <Field label="Kilometers" value={km} onChangeText={setKm} onFocus={onInputFocus} placeholder="18000" keyboardType="number-pad" />
                <Text style={{ fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Fuel</Text>
                <ChipRow options={VEHICLE_FUEL} value={fuel} onChange={setFuel} />
              </>
            ) : null}
            {vertical === "services" || vertical === "nearby" ? (
              <>
                <Text style={{ fontWeight: "700", marginTop: 4, marginBottom: 8 }}>Rate type</Text>
                <ChipRow options={SERVICE_RATE} value={rateType} onChange={setRateType} />
                <Field label="Availability" value={availability} onChangeText={setAvailability} onFocus={onInputFocus} placeholder="Daily 8am–6pm, Lahan and nearby" />
              </>
            ) : null}
            {vertical === "marketplace" ? (
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
                Condition is set on the first step (New or Used). Price can be left blank or marked negotiable next.
              </Text>
            ) : null}
            <Field label="Contact name" value={contactName} onChangeText={setContactName} onFocus={onInputFocus} placeholder="Your name" />
            <Field
              label="Phone"
              value={contactPhone}
              onChangeText={(value) => {
                setContactPhone(value);
                clearFieldError("phone");
              }}
              onFocus={onInputFocus}
              placeholder="98xxxxxxxx"
              keyboardType="phone-pad"
              invalid={errorField === "phone"}
              onBindRef={(ref) => bindFieldRef("phone", ref)}
            />
            <Field label="Email (optional)" value={contactEmail} onChangeText={setContactEmail} onFocus={onInputFocus} placeholder="you@email.com" />
            <Text style={{ fontWeight: "700", marginTop: 14, marginBottom: 8 }}>
              {vertical === "jobs" ? "How should applicants reach you?" : "How should buyers reach you?"}
            </Text>
            {CONTACT_OPTIONS.map((item) => {
              const on = contactVia === item.key;
              return (
                <PressScale
                  key={item.key}
                  onPress={() => setContactVia(item.key)}
                  style={{
                    marginBottom: 8,
                    backgroundColor: on ? "#E4F6EA" : "#fff",
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1.5,
                    borderColor: on ? GREEN : colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={on ? GREEN : colors.muted} />
                  <Text style={{ fontWeight: "700", flex: 1 }}>{item.label}</Text>
                  {on ? <Ionicons name="checkmark-circle" size={18} color={GREEN} /> : null}
                </PressScale>
              );
            })}
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <Field label={`${copy.priceLabel} (optional)`} value={price} onChangeText={setPrice} onFocus={onInputFocus} placeholder={copy.pricePlaceholder} keyboardType="number-pad" />
            {isProvider(user) ? (
              <View
                style={{
                  marginTop: 8,
                  marginBottom: 10,
                  backgroundColor: walletShort ? "#FEF2F2" : "#E4F6EA",
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: walletShort ? "#FECACA" : "#BBF7D0",
                }}
              >
                <Text style={{ fontWeight: "800", color: walletShort ? "#B91C1C" : GREEN, fontSize: 13 }}>
                  Listing charge vs wallet
                </Text>
                <Text style={{ color: walletShort ? "#7F1D1D" : "#14532D", fontSize: 13, marginTop: 8, lineHeight: 20 }}>
                  Ad price: Rs. {listingPriceRupees.toLocaleString("en-IN")}
                  {"\n"}Publish fee: {listingFeeLabel}
                  {"\n"}Your wallet: {walletLabel}
                </Text>
                {walletShort ? (
                  <>
                    <Text style={{ color: "#B91C1C", fontSize: 12, marginTop: 8, fontWeight: "700" }}>
                      Wallet is less than the listing charge. Add balance to continue.
                    </Text>
                    <PressScale
                      onPress={() => openSellerPage(navigation, "add-fund")}
                      style={{ marginTop: 10, backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "800" }}>Add balance</Text>
                    </PressScale>
                  </>
                ) : (
                  <Text style={{ color: "#166534", fontSize: 12, marginTop: 8 }}>
                    You have enough balance to publish at this price.
                  </Text>
                )}
                {(payConfig?.listing_fee_tiers || []).length ? (
                  <Text style={{ color: walletShort ? "#991B1B" : "#166534", fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                    {(payConfig?.listing_fee_tiers || []).map((row) => formatFeeBand(row)).join("\n")}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <Field
              label="Discount % (optional)"
              value={discountPct}
              onChangeText={(v) => setDiscountPct(v.replace(/\D/g, "").slice(0, 2))}
              onFocus={onInputFocus}
              placeholder="e.g. 15"
              keyboardType="number-pad"
            />
            {Number(discountPct) > 0 && String(price).replace(/\D/g, "") ? (
              <View style={{ marginTop: 4, marginBottom: 10, backgroundColor: "#FFF7ED", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#FED7AA" }}>
                <Text style={{ fontWeight: "800", fontSize: 20, color: "#EA580C" }}>
                  Rs. {Math.max(0, Math.round(Number(String(price).replace(/\D/g, "")) * (100 - Number(discountPct)) / 100)).toLocaleString("en-IN")}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                  <Text style={{ color: "#9CA3AF", textDecorationLine: "line-through" }}>
                    Rs. {Number(String(price).replace(/\D/g, "")).toLocaleString("en-IN")}
                  </Text>
                  <Text style={{ color: "#9CA3AF" }}>-{Number(discountPct)}%</Text>
                </View>
              </View>
            ) : null}
            <PressScale
              onPress={() => setNegotiable((value) => !value)}
              style={[toggleStyle, { backgroundColor: negotiable ? "#E4F6EA" : "#fff", borderColor: negotiable ? GREEN : colors.border }]}
            >
              <Ionicons name={negotiable ? "checkbox" : "square-outline"} size={20} color={GREEN} />
              <Text style={{ fontWeight: "700" }}>{vertical === "jobs" ? "Salary is negotiable" : "Price is negotiable"}</Text>
            </PressScale>
            <PressScale
              onPress={() => setPromote((value) => !value)}
              style={[toggleStyle, { backgroundColor: promote ? "#E4F6EA" : "#fff", borderColor: promote ? GREEN : colors.border }]}
            >
              <Ionicons name={promote ? "checkbox" : "square-outline"} size={20} color={GREEN} />
              <Text style={{ fontWeight: "700" }}>Request featured listing (admin approves — no in-app payment)</Text>
            </PressScale>
          </View>
        ) : null}

        {step === 3 ? (
          <View>
            <PressScale onPress={() => void pickPhotos()} style={{ backgroundColor: GREEN, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{photos.length ? "Replace photos" : "Upload photos (optional)"}</Text>
            </PressScale>
            <Text style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>{copy.photoHint}</Text>
            {uploading ? (
              <View style={{ marginTop: 12, height: 10, backgroundColor: colors.border, borderRadius: 8, overflow: "hidden" }}>
                <View style={{ width: `${uploadPct}%`, height: 10, backgroundColor: GREEN }} />
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {photos.map((uri, index) => (
                <View key={`${index}-${uri.slice(-18)}`}>
                  <AuthImage uri={uri} style={{ width: 96, height: 96, borderRadius: 12 }} />
                  <PressScale
                    onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                    style={{ position: "absolute", top: 4, right: 4, backgroundColor: "#fff", borderRadius: 10, padding: 2 }}
                  >
                    <Ionicons name="close" size={14} color={colors.navy} />
                  </PressScale>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E6E8EC", ...shadow.card }}>
            {photos[0] ? <AuthImage uri={photos[0]} style={{ width: "100%", height: 160, borderRadius: 14 }} /> : null}
            <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 12 }}>{title || "Untitled listing"}</Text>
            <Text style={{ color: GREEN, fontWeight: "800", marginTop: 4 }}>
              {price.replace(/\D/g, "")
                ? Number(discountPct) > 0
                  ? `Rs. ${Math.max(0, Math.round(Number(price.replace(/\D/g, "")) * (100 - Number(discountPct)) / 100)).toLocaleString("en-IN")}  (${Number(discountPct)}% off)`
                  : `Rs. ${Number(price.replace(/\D/g, "")).toLocaleString("en-IN")}`
                : negotiable
                  ? "Price negotiable"
                  : "Price on request"}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              {dealType} · {propertyType}
              {company ? ` · ${company}` : ""}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{location}</Text>
            <Text style={{ marginTop: 10, lineHeight: 20 }}>{description}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {features.map((item, index) => (
                <Text key={`${item}-${index}`} style={{ backgroundColor: "#E7F6EC", color: GREEN, fontWeight: "700", fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                  {item}
                </Text>
              ))}
            </View>
            {isProvider(user) ? (
              <View style={{ marginTop: 12, backgroundColor: "#E4F6EA", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#BBF7D0" }}>
                <Text style={{ fontWeight: "800", color: GREEN, fontSize: 13 }}>Publish charge for this listing</Text>
                <Text style={{ color: "#14532D", fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                  {listingPriceRupees > 0
                    ? `Ad price Rs. ${listingPriceRupees.toLocaleString("en-IN")} → listing fee ${listingFeeLabel}. Deducted from your loaded wallet when you publish.`
                    : `No ad price entered. Default listing fee ${payConfig?.listing_fee_label || listingFeeLabel} applies if admin has not set a matching band.`}
                </Text>
                <Text style={{ color: "#166534", fontSize: 12, marginTop: 6 }}>Wallet: {walletLabel}</Text>
              </View>
            ) : (
              <Text style={{ marginTop: 12, color: colors.muted, fontSize: 12 }}>
                Submit publishes this listing live. Admin can still review and deactivate if needed.
              </Text>
            )}
          </View>
        ) : null}

        {error ? <Text style={{ marginTop: 12, color: colors.red }}>{error}</Text> : null}
      </KeyboardScreen>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: listingId ? Math.max(insets.bottom, 10) : 10,
          borderTopWidth: 1,
          borderColor: "#E6E8EC",
          backgroundColor: "#fff",
          gap: 8,
        }}
      >
        <PressScale
          onPress={() => (listingId ? navigation.goBack() : navigation.jumpTo("Home"))}
          style={{
            borderWidth: 1,
            borderColor: "#E6E8EC",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <Ionicons name="close" size={14} color="#4B5563" />
          <Text style={{ fontWeight: "700", color: "#4B5563", fontSize: 12 }}>Cancel</Text>
        </PressScale>
        <Text
          style={{ flex: 1, textAlign: "center", color: "#6B7280", fontSize: 11, fontWeight: "700" }}
          numberOfLines={1}
        >
          Step {step + 1} of 5 | {STEPS[step].key === "Basic Info" ? "Basic Information" : STEPS[step].key}
        </Text>
        <PressScale
          onPress={step === 2 && walletShort ? () => openSellerPage(navigation, "add-fund") : next}
          style={{
            backgroundColor: step === 2 && walletShort ? "#2563EB" : GREEN,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: busy ? 0.7 : 1,
            flexShrink: 0,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
            {busy ? "Saving…" : step === 2 && walletShort ? "Add balance" : nextLabel}
          </Text>
          <Ionicons name={step === 2 && walletShort ? "wallet-outline" : "arrow-forward"} size={14} color="#fff" />
        </PressScale>
      </View>

      <Modal visible={addFeatureOpen} transparent animationType="fade" onRequestClose={() => setAddFeatureOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 }}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: colors.navy }}>{copy.featureLabel}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {VERTICAL_FEATURES[vertical].map((item) => (
                <PressScale
                  key={item}
                  onPress={() => addFeature(item)}
                  style={{ backgroundColor: "#E7F6EC", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 }}
                >
                  <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{item}</Text>
                </PressScale>
              ))}
            </View>
            <TextInput
              value={customFeature}
              onChangeText={setCustomFeature}
              placeholder={`Custom ${copy.featureLabel.toLowerCase()}`}
              placeholderTextColor="#9AA0A6"
              style={[inputStyle, { marginTop: 12 }]}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <PressScale onPress={() => setAddFeatureOpen(false)} style={{ flex: 1, alignItems: "center", padding: 12 }}>
                <Text style={{ fontWeight: "700", color: "#6B7280" }}>Close</Text>
              </PressScale>
              <PressScale
                onPress={() => addFeature(customFeature)}
                style={{ flex: 1, backgroundColor: GREEN, borderRadius: 12, alignItems: "center", padding: 12 }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Add</Text>
              </PressScale>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={mapOpen} animationType="none" onRequestClose={() => setMapOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#E8EEF3" }}>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: "#111827", flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, color: "#fff", fontWeight: "800" }}>Pin exact location</Text>
            <PressScale onPress={() => setMapOpen(false)}>
              <Text style={{ color: GREEN, fontWeight: "800" }}>Done</Text>
            </PressScale>
          </View>
          <OsmWebMap
            mode="pick"
            center={lat != null && lng != null ? { lat, lng } : LAHAN}
            zoom={16}
            pin={lat != null && lng != null ? { lat, lng } : LAHAN}
            onPin={(point) => {
              clearFieldError("pin");
              void applyPin(point);
            }}
          />
          <Text style={{ color: "#D1D5DB", padding: 12, fontSize: 12 }}>Tap or drag the pin. Buyers use this point for directions.</Text>
        </View>
      </Modal>
      <Modal visible={typeOpen} transparent animationType="fade" onRequestClose={() => setTypeOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setTypeOpen(false)}>
          <Pressable
            onPress={() => undefined}
            style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 10 }}>{copy.typeLabel}</Text>
            {types.map((item) => {
              const on = propertyType === item.key;
              return (
                <PressScale
                  key={item.key}
                  onPress={() => {
                    setPropertyType(item.key);
                    setTypeOpen(false);
                  }}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    marginBottom: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: on ? "#E8F7EC" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: on ? GREEN : "#E5E7EB",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={item.icon} size={16} color={GREEN} />
                    <Text style={{ fontWeight: "700", color: on ? GREEN : colors.navy }}>{item.key}</Text>
                  </View>
                  {on ? <Ionicons name="checkmark-circle" size={18} color={GREEN} /> : null}
                </PressScale>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
      {toast ? <FormToast message={toast} /> : null}
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: "#E6E8EC",
  backgroundColor: "#fff",
  borderRadius: 12,
  minHeight: 50,
  paddingHorizontal: 12,
  paddingVertical: 12,
  color: "#0B1D2A",
};

const invalidStyle = {
  borderColor: colors.red,
  backgroundColor: "#FFF5F5",
  borderWidth: 1.6,
};

const toggleStyle = {
  marginTop: 12,
  borderRadius: 16,
  padding: 14,
  borderWidth: 1.5,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
};

function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((item) => {
        const on = value === item;
        return (
          <PressScale
            key={item}
            onPress={() => onChange(item)}
            style={{
              borderWidth: 1.5,
              borderColor: on ? GREEN : "#E6E8EC",
              backgroundColor: on ? "#E4F6EA" : "#fff",
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontWeight: "800", fontSize: 12, color: on ? GREEN : colors.navy }}>{item}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  onFocus,
  placeholder,
  multiline,
  keyboardType,
  invalid,
  onBindRef,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  invalid?: boolean;
  onBindRef?: (ref: View | null) => void;
}) {
  return (
    <View ref={(node) => onBindRef?.(node)} style={{ marginTop: 12 }}>
      <Text style={{ fontWeight: "700", marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[inputStyle, { minHeight: multiline ? 110 : 50, textAlignVertical: multiline ? "top" : "center" }, invalid ? invalidStyle : null]}
      />
    </View>
  );
}

function ErrorScrollHelper({
  errorField,
  errorTick,
  fieldRefs,
}: {
  errorField: FieldKey | null;
  errorTick: number;
  fieldRefs: MutableRefObject<Partial<Record<FieldKey, View | null>>>;
}) {
  const { scrollAnchorIntoView } = useKeyboardScroll();
  useEffect(() => {
    if (!errorField) return;
    const timer = setTimeout(() => {
      scrollAnchorIntoView(fieldRefs.current[errorField] || null);
    }, 80);
    return () => clearTimeout(timer);
  }, [errorField, errorTick, fieldRefs, scrollAnchorIntoView]);
  return null;
}

function Counter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const n = Number(value) || 0;
  return (
    <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontWeight: "700" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <PressScale
          onPress={() => onChange(String(Math.max(0, n - 1)))}
          style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "#E6E8EC", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="remove" size={16} color={colors.navy} />
        </PressScale>
        <Text style={{ width: 24, textAlign: "center", fontWeight: "800" }}>{n}</Text>
        <PressScale
          onPress={() => onChange(String(n + 1))}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="add" size={16} color="#fff" />
        </PressScale>
      </View>
    </View>
  );
}
