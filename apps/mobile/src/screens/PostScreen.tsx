import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Alert, Image, Keyboard, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { PressScale } from "../components/PressScale";
import { useAuth } from "../context/AuthContext";
import { canPostServices, isProvider } from "../demo";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

const steps = [
  { key: "Basic Info", icon: "home-outline" as const },
  { key: "Details", icon: "list-outline" as const },
  { key: "Pricing", icon: "pricetag-outline" as const },
  { key: "Media", icon: "image-outline" as const },
  { key: "Review", icon: "checkmark-circle-outline" as const },
];

const categories = [
  { key: "For Sale", icon: "home-outline" as const },
  { key: "For Rent", icon: "key-outline" as const },
  { key: "Land", icon: "leaf-outline" as const },
  { key: "Commercial", icon: "business-outline" as const },
];

const propertyTypes = ["House", "Flat", "Apartment", "Land", "Shop", "Office"];

const amenityOptions = ["Parking", "Water boring", "Backup light", "Wi-Fi", "Garden", "CCTV", "Furnished", "Near school"];
const facingOptions = ["East", "West", "North", "South"];
const furnishOptions = ["Unfurnished", "Semi", "Fully"];

const galleryPool = [
  require("../../assets/listings/house.jpg"),
  require("../../assets/listings/flat.jpg"),
  require("../../assets/listings/apartment.jpg"),
  require("../../assets/listings/modern.jpg"),
  require("../../assets/listings/land.jpg"),
  require("../../assets/listings/shop.jpg"),
];

export function PostScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("For Sale");
  const [ptype, setPtype] = useState("House");
  const [title, setTitle] = useState("Modern 3 BHK House for Sale in Lahan");
  const [address, setAddress] = useState("Lahan-3, Siraha, Nepal");
  const [desc, setDesc] = useState("Bright rooms, tiled floors, parking for one car. Near school and bazaar.");
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [sqft, setSqft] = useState("1800");
  const [amenities, setAmenities] = useState<string[]>(["Parking", "Water boring"]);
  const [facing, setFacing] = useState("East");
  const [furnish, setFurnish] = useState("Semi");
  const [price, setPrice] = useState("2500000");
  const [negotiable, setNegotiable] = useState(true);
  const [photos, setPhotos] = useState<number[]>([galleryPool[0], galleryPool[1]]);

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
              ? "NAJIK admin rejected this application. You cannot post services yet."
              : "You cannot post services until NAJIK admin verifies your nagrita, photo and details."}
          </Text>
        </View>
      </View>
    );
  }

  function next() {
    Keyboard.dismiss();
    if (step < 4) setStep((s) => s + 1);
    else {
      Alert.alert("Listing live", "Demo listing published. Buyers in Lahan can now see it.", [
        { text: "View listings", onPress: () => (isProvider(user) ? navigation.jumpTo("Listings") : navigation.jumpTo("Home")) },
      ]);
    }
  }

  function back() {
    if (step === 0) navigation.jumpTo("Home");
    else setStep(step - 1);
  }

  const nextLabel = ["Next: Details", "Next: Pricing", "Next: Photos", "Next: Review", "Publish listing"][step];

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="draft" showPro={isProvider(user)} onClose={back} />
      <KeyboardScreen key={`post-step-${step}`} style={{ backgroundColor: "#F7F8FA" }} contentStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={{ marginBottom: 10 }}>
          <View style={{ position: "absolute", left: 18, right: 18, top: 16, height: 2, backgroundColor: colors.border }} />
          <View style={{ position: "absolute", left: 18, width: `${(step / 4) * 100}%`, top: 16, height: 2, backgroundColor: GREEN }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {steps.map((item, index) => {
              const on = index === step;
              const done = index < step;
              return (
                <PressScale key={item.key} onPress={() => setStep(index)} style={{ alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: on || done ? GREEN : "#fff",
                      borderWidth: 1.5,
                      borderColor: on || done ? GREEN : colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={done && !on ? "checkmark" : item.icon} size={16} color={on || done ? "#fff" : colors.muted} />
                  </View>
                  <Text style={{ fontSize: 9, marginTop: 4, fontWeight: on ? "800" : "600", color: on ? GREEN : colors.muted }}>{item.key}</Text>
                </PressScale>
              );
            })}
          </View>
        </View>

        {step === 0 ? (
          <BasicStep
            category={category}
            setCategory={setCategory}
            ptype={ptype}
            setPtype={setPtype}
            title={title}
            setTitle={setTitle}
            address={address}
            setAddress={setAddress}
            desc={desc}
            setDesc={setDesc}
          />
        ) : null}
        {step === 1 ? (
          <DetailsStep
            beds={beds}
            setBeds={setBeds}
            baths={baths}
            setBaths={setBaths}
            sqft={sqft}
            setSqft={setSqft}
            amenities={amenities}
            setAmenities={setAmenities}
            facing={facing}
            setFacing={setFacing}
            furnish={furnish}
            setFurnish={setFurnish}
          />
        ) : null}
        {step === 2 ? <PricingStep category={category} price={price} setPrice={setPrice} negotiable={negotiable} setNegotiable={setNegotiable} /> : null}
        {step === 3 ? <MediaStep photos={photos} setPhotos={setPhotos} /> : null}
        {step === 4 ? (
          <ReviewStep
            category={category}
            ptype={ptype}
            title={title}
            address={address}
            desc={desc}
            beds={beds}
            baths={baths}
            sqft={sqft}
            amenities={amenities}
            facing={facing}
            furnish={furnish}
            price={price}
            negotiable={negotiable}
            photos={photos}
            onEdit={setStep}
          />
        ) : null}

        <PressScale
          onPress={next}
          style={{
            marginTop: 22,
            backgroundColor: GREEN,
            borderRadius: 16,
            paddingVertical: 15,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{nextLabel}</Text>
          <Ionicons name={step === 4 ? "checkmark" : "arrow-forward"} size={16} color="#fff" />
        </PressScale>
      </KeyboardScreen>

      <View style={{ flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }}>
        <PressScale
          onPress={back}
          style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name={step === 0 ? "close" : "arrow-back"} size={14} color={colors.text} />
          <Text style={{ fontWeight: "700" }}>{step === 0 ? "Cancel" : "Back"}</Text>
        </PressScale>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: GREEN, fontSize: 12, fontWeight: "800" }}>Step {step + 1} of 5</Text>
          <Text style={{ color: colors.muted, fontSize: 10 }}>{steps[step].key}</Text>
        </View>
        <PressScale
          onPress={next}
          style={{ backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>{nextLabel}</Text>
          <Ionicons name={step === 4 ? "checkmark" : "arrow-forward"} size={14} color="#fff" />
        </PressScale>
      </View>
    </View>
  );
}

function BasicStep({
  category,
  setCategory,
  ptype,
  setPtype,
  title,
  setTitle,
  address,
  setAddress,
  desc,
  setDesc,
}: {
  category: string;
  setCategory: (v: string) => void;
  ptype: string;
  setPtype: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
}) {
  return (
    <>
      <Text style={{ fontWeight: "800", fontSize: 18, color: colors.navy }}>Basic information</Text>
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, marginBottom: 14 }}>What are you listing in Lahan?</Text>

      <Text style={{ fontWeight: "800", marginBottom: 8 }}>Deal type</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {categories.map((item) => {
          const on = item.key === category;
          return (
            <PressScale
              key={item.key}
              onPress={() => setCategory(item.key)}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 14,
                paddingVertical: 12,
                borderWidth: 1.5,
                borderColor: on ? GREEN : colors.border,
                alignItems: "center",
              }}
            >
              <Ionicons name={item.icon} size={20} color={on ? GREEN : "#6B7280"} />
              <Text style={{ fontWeight: "800", marginTop: 6, fontSize: 11, color: on ? GREEN : colors.navy }}>{item.key}</Text>
            </PressScale>
          );
        })}
      </View>

      <Text style={{ fontWeight: "800", marginTop: 16, marginBottom: 8 }}>Property type</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {propertyTypes.map((item) => {
          const on = item === ptype;
          return (
            <PressScale
              key={item}
              onPress={() => setPtype(item)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: on ? GREEN : "#fff",
                borderWidth: 1,
                borderColor: on ? GREEN : colors.border,
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 12, color: on ? "#fff" : "#374151" }}>{item}</Text>
            </PressScale>
          );
        })}
      </View>

      <Label title="Listing title" hint={`${title.length}/60`} />
      <FormInput value={title} onChangeText={setTitle} />

      <Label title="Location" hint="Lahan & nearby" />
      <Field value={address} onChangeText={setAddress} icon="location" />
      <PressScale
        onPress={() => setAddress("Lahan-3, Siraha, Nepal")}
        style={{ marginTop: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Ionicons name="navigate" size={14} color={GREEN} />
        <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>Use Lahan pin</Text>
      </PressScale>

      <Label title="Short description" hint={`${desc.length}/1000`} />
      <FormInput value={desc} onChangeText={setDesc} multiline />
    </>
  );
}

function DetailsStep({
  beds,
  setBeds,
  baths,
  setBaths,
  sqft,
  setSqft,
  amenities,
  setAmenities,
  facing,
  setFacing,
  furnish,
  setFurnish,
}: {
  beds: number;
  setBeds: (n: number) => void;
  baths: number;
  setBaths: (n: number) => void;
  sqft: string;
  setSqft: (v: string) => void;
  amenities: string[];
  setAmenities: (v: string[]) => void;
  facing: string;
  setFacing: (v: string) => void;
  furnish: string;
  setFurnish: (v: string) => void;
}) {
  return (
    <>
      <Text style={{ fontWeight: "800", fontSize: 18, color: colors.navy }}>Property details</Text>
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, marginBottom: 14 }}>Size and what is included.</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Counter label="Bedrooms" value={beds} onChange={setBeds} />
        <Counter label="Bathrooms" value={baths} onChange={setBaths} />
      </View>

      <Label title="Built-up area (sqft)" />
      <FormInput value={sqft} onChangeText={setSqft} />

      <Text style={{ fontWeight: "800", marginTop: 16, marginBottom: 8 }}>Facing</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {facingOptions.map((item) => {
          const on = item === facing;
          return (
            <PressScale
              key={item}
              onPress={() => setFacing(item)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: on ? GREEN : "#fff",
                borderWidth: 1.5,
                borderColor: on ? GREEN : colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 12, color: on ? "#fff" : "#374151" }}>{item}</Text>
            </PressScale>
          );
        })}
      </View>

      <Text style={{ fontWeight: "800", marginTop: 16, marginBottom: 8 }}>Furnishing</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {furnishOptions.map((item) => {
          const on = item === furnish;
          return (
            <PressScale
              key={item}
              onPress={() => setFurnish(item)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: on ? GREEN : "#fff",
                borderWidth: 1.5,
                borderColor: on ? GREEN : colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 12, color: on ? "#fff" : "#374151" }}>{item}</Text>
            </PressScale>
          );
        })}
      </View>

      <Text style={{ fontWeight: "800", marginTop: 16, marginBottom: 8 }}>Amenities</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {amenityOptions.map((item) => {
          const on = amenities.includes(item);
          return (
            <PressScale
              key={item}
              onPress={() => setAmenities(on ? amenities.filter((a) => a !== item) : [...amenities, item])}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: on ? "#E7F6EC" : "#fff",
                borderWidth: 1.5,
                borderColor: on ? GREEN : colors.border,
              }}
            >
              <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={14} color={on ? GREEN : "#9AA0A6"} />
              <Text style={{ fontWeight: "700", fontSize: 12, color: on ? GREEN : "#374151" }}>{item}</Text>
            </PressScale>
          );
        })}
      </View>
    </>
  );
}

function PricingStep({
  category,
  price,
  setPrice,
  negotiable,
  setNegotiable,
}: {
  category: string;
  price: string;
  setPrice: (v: string) => void;
  negotiable: boolean;
  setNegotiable: (v: boolean) => void;
}) {
  const presets = category === "For Rent" ? ["15000", "18000", "22000", "35000"] : ["1800000", "2500000", "3200000", "4500000"];
  return (
    <>
      <Text style={{ fontWeight: "800", fontSize: 18, color: colors.navy }}>Pricing</Text>
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, marginBottom: 14 }}>
        {category === "For Rent" ? "Monthly rent in Rs." : "Asking price in Rs."}
      </Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, ...shadow.card }}>
        <Text style={{ color: "#8A8F98", fontWeight: "700" }}>Rs.</Text>
        <FormInput value={price} onChangeText={setPrice} />
        <Text style={{ color: GREEN, fontWeight: "800", marginTop: 8, fontSize: 18 }}>
          Rs. {Number(price || 0).toLocaleString("en-IN")}
          {category === "For Rent" ? " /mo" : ""}
        </Text>
      </View>
      <Text style={{ fontWeight: "800", marginTop: 16, marginBottom: 8 }}>Quick set</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {presets.map((p) => (
          <PressScale
            key={p}
            onPress={() => setPrice(p)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: price === p ? GREEN : "#fff",
              borderWidth: 1,
              borderColor: price === p ? GREEN : colors.border,
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 12, color: price === p ? "#fff" : "#374151" }}>
              Rs. {Number(p).toLocaleString("en-IN")}
            </Text>
          </PressScale>
        ))}
      </View>
      <PressScale
        onPress={() => setNegotiable(!negotiable)}
        style={{
          marginTop: 16,
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          ...shadow.card,
        }}
      >
        <Ionicons name={negotiable ? "checkbox" : "square-outline"} size={20} color={GREEN} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "800" }}>Price is negotiable</Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>Buyers can make an offer on NAJIK.</Text>
        </View>
      </PressScale>
    </>
  );
}

function MediaStep({ photos, setPhotos }: { photos: number[]; setPhotos: (v: number[]) => void }) {
  return (
    <>
      <Text style={{ fontWeight: "800", fontSize: 18, color: colors.navy }}>Photos</Text>
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, marginBottom: 14 }}>Tap to add or remove. First photo is the cover.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {galleryPool.map((src, i) => {
          const on = photos.includes(src);
          return (
            <PressScale key={i} onPress={() => setPhotos(on ? photos.filter((p) => p !== src) : [...photos, src])} style={{ width: "31%" }}>
              <Image source={src} style={{ width: "100%", height: 92, borderRadius: 12, borderWidth: on ? 3 : 0, borderColor: GREEN }} />
              {on ? (
                <View style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              ) : null}
              {photos[0] === src ? (
                <View style={{ position: "absolute", left: 6, bottom: 6, backgroundColor: GREEN, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>COVER</Text>
                </View>
              ) : null}
            </PressScale>
          );
        })}
      </View>
      <Text style={{ color: "#8A8F98", fontSize: 12, marginTop: 12 }}>{photos.length} photos selected</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <PressScale onPress={() => Alert.alert("Camera", "Demo: take a photo of the listing.")} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="camera-outline" size={18} color={GREEN} />
          <Text style={{ fontWeight: "800", fontSize: 12, marginTop: 4 }}>Camera</Text>
        </PressScale>
        <PressScale onPress={() => Alert.alert("Gallery", "Demo: pick from your phone.")} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="images-outline" size={18} color={GREEN} />
          <Text style={{ fontWeight: "800", fontSize: 12, marginTop: 4 }}>Gallery</Text>
        </PressScale>
      </View>
    </>
  );
}

function ReviewStep({
  category,
  ptype,
  title,
  address,
  desc,
  beds,
  baths,
  sqft,
  amenities,
  facing,
  furnish,
  price,
  negotiable,
  photos,
  onEdit,
}: {
  category: string;
  ptype: string;
  title: string;
  address: string;
  desc: string;
  beds: number;
  baths: number;
  sqft: string;
  amenities: string[];
  facing: string;
  furnish: string;
  price: string;
  negotiable: boolean;
  photos: number[];
  onEdit: (step: number) => void;
}) {
  return (
    <>
      <Text style={{ fontWeight: "800", fontSize: 18, color: colors.navy }}>Review & publish</Text>
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, marginBottom: 12 }}>Check everything, then publish.</Text>
      {photos.length ? (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {photos.slice(0, 4).map((src, i) => (
            <Image key={i} source={src} style={{ flex: 1, height: 72, borderRadius: 12 }} />
          ))}
        </View>
      ) : null}
      <Text style={{ fontWeight: "800", fontSize: 20 }}>{title}</Text>
      <Text style={{ color: GREEN, fontWeight: "800", fontSize: 18, marginTop: 6 }}>
        Rs. {Number(price || 0).toLocaleString("en-IN")}
        {category === "For Rent" ? " /mo" : ""}
      </Text>
      <Text style={{ color: "#6B7280", marginTop: 6 }}>{address}</Text>
      <Text style={{ color: "#4B5563", marginTop: 10, lineHeight: 20 }}>{desc}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {[category, ptype, `${beds} Beds`, `${baths} Baths`, `${sqft} sqft`, `${facing} facing`, furnish, negotiable ? "Negotiable" : "Fixed", ...amenities].map((tag) => (
          <View key={tag} style={{ backgroundColor: "#E7F6EC", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <Text style={{ color: GREEN, fontWeight: "700", fontSize: 11 }}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        {[0, 1, 2, 3].map((s) => (
          <PressScale key={s} onPress={() => onEdit(s)} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontWeight: "800", fontSize: 11, color: GREEN }}>Edit {steps[s].key.split(" ")[0]}</Text>
          </PressScale>
        ))}
      </View>
    </>
  );
}

function Label({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 8 }}>
      <Text style={{ fontWeight: "800", color: colors.navy }}>{title}</Text>
      {hint ? <Text style={{ color: GREEN, fontSize: 11, fontWeight: "700" }}>{hint}</Text> : null}
    </View>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 12, ...shadow.card }}>
      <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "700" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, justifyContent: "space-between" }}>
        <PressScale onPress={() => onChange(Math.max(0, value - 1))} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="remove" size={16} color="#111827" />
        </PressScale>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>{value}</Text>
        <PressScale onPress={() => onChange(value + 1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="add" size={16} color="#fff" />
        </PressScale>
      </View>
    </View>
  );
}

function FormInput({ value, onChangeText, multiline }: { value: string; onChangeText: (v: string) => void; multiline?: boolean }) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onFocus={onInputFocus}
      multiline={multiline}
      style={{
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        color: colors.text,
        minHeight: multiline ? 90 : undefined,
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

function Field({
  value,
  onChangeText,
  icon,
}: {
  value: string;
  onChangeText?: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { onInputFocus } = useKeyboardScroll();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8 }}>
      <Ionicons name={icon} size={16} color={GREEN} />
      <TextInput value={value} onChangeText={onChangeText} onFocus={onInputFocus} editable={!!onChangeText} style={{ flex: 1, color: colors.text }} />
    </View>
  );
}
