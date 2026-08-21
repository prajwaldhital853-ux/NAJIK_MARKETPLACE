import { Ionicons } from "@expo/vector-icons";
import { Dimensions, Image, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, shadow } from "../theme";
import { Avatar } from "./Avatar";
import { PressScale } from "./PressScale";

const { width: SCREEN_W } = Dimensions.get("window");

/** Every size below is a fraction of the card width, measured off the NAJIK mock (426pt wide card). */
const W = SCREEN_W - 32;
const f = (frac: number, min: number) => Math.max(Math.round(frac * W), min);

const GREEN = "#004E38";
const GREEN_DEEP = "#00301F";
const R = f(0.047, 16);
const GREEN_H = f(0.3, 124);
const LIFT = f(0.08, 28);
const AVATAR = f(0.15, 56);
const G_TOP = LIFT;
const G_BOT = LIFT + GREEN_H;

/**
 * Right edge of the green, sampled from the mock: it starts at 53.5% of the width and sweeps
 * right as it goes down, reaching the card edge just past half the green's height.
 */
const EDGE: [number, number][] = [
  [0.0, 0.535],
  [0.03, 0.599],
  [0.059, 0.634],
  [0.089, 0.655],
  [0.119, 0.676],
  [0.149, 0.692],
  [0.178, 0.709],
  [0.208, 0.723],
  [0.238, 0.735],
  [0.267, 0.746],
  [0.297, 0.756],
  [0.327, 0.765],
  [0.356, 0.779],
  [0.386, 0.791],
  [0.416, 0.808],
  [0.446, 0.824],
  [0.475, 0.85],
  [0.505, 0.878],
  [0.535, 0.981],
  [0.564, 1],
];

const GREEN_PATH = [
  `M${R} ${G_TOP}`,
  `H${(EDGE[0][1] * W).toFixed(1)}`,
  ...EDGE.slice(1).map(([y, x]) => `L${(x * W).toFixed(1)} ${(G_TOP + y * GREEN_H).toFixed(1)}`),
  `L${W} ${(G_TOP + 0.58 * GREEN_H).toFixed(1)}`,
  `V${G_BOT - R}`,
  `Q${W} ${G_BOT} ${W - R} ${G_BOT}`,
  `H${R}`,
  `Q0 ${G_BOT} 0 ${G_BOT - R}`,
  `V${G_TOP + R}`,
  `Q0 ${G_TOP} ${R} ${G_TOP}`,
  "Z",
].join(" ");

type Scene = { src: number };

const SERVICE_PHOTOS: Record<string, Scene> = {
  "Real Estate": { src: require("../../assets/hero/house.png") },
  "Job Poster": { src: require("../../assets/hero/office.png") },
  Vehicles: { src: require("../../assets/hero/car.png") },
  "Local Services": { src: require("../../assets/hero/tools.png") },
  "Used Items": { src: require("../../assets/hero/shop.png") },
  Other: { src: require("../../assets/hero/shop.png") },
};

const SERVICE_TITLES: Record<string, string> = {
  "Real Estate": "Real Estate & Property Service",
  "Job Poster": "Job Posting Service",
  Vehicles: "Vehicle Sales & Service",
  "Local Services": "Local Home Services",
  "Used Items": "Used Items Marketplace",
  Other: "Other Services",
};

export function serviceHeroPhoto(service?: string): Scene {
  const value = (service || "").toLowerCase();
  if (value.includes("job")) return SERVICE_PHOTOS["Job Poster"];
  if (value.includes("used") || value.includes("market")) return SERVICE_PHOTOS["Used Items"];
  if (value.includes("vehicle")) return SERVICE_PHOTOS.Vehicles;
  if (value.includes("local")) return SERVICE_PHOTOS["Local Services"];
  if (value.includes("other")) return SERVICE_PHOTOS.Other;
  return SERVICE_PHOTOS["Real Estate"];
}

export function serviceHeroTitle(service?: string) {
  if (!service) return SERVICE_TITLES["Real Estate"];
  const value = service.toLowerCase();
  if (value.includes("job")) return SERVICE_TITLES["Job Poster"];
  if (value.includes("used") || value.includes("market")) return SERVICE_TITLES["Used Items"];
  if (value.includes("vehicle")) return SERVICE_TITLES.Vehicles;
  if (value.includes("local")) return SERVICE_TITLES["Local Services"];
  if (value.includes("other")) return SERVICE_TITLES.Other;
  return SERVICE_TITLES[service] || service;
}

function postedCopy(service?: string, count = 0) {
  const n = Math.max(0, count);
  const listingsWord = n === 1 ? "listing" : "listings";
  const value = (service || "").toLowerCase();
  if (value.includes("job")) {
    return {
      title: `You have ${n} job ${listingsWord} posted`,
      body: n ? "Open My Listings to manage openings buyers can apply to." : "",
    };
  }
  if (value.includes("used") || value.includes("market")) {
    return {
      title: `You have ${n} item ${listingsWord} posted`,
      body: n ? "Buyers can see approved items in Used Items Marketplace." : "",
    };
  }
  if (value.includes("vehicle")) {
    return {
      title: `You have ${n} vehicle ${listingsWord} posted`,
      body: n ? "Approved vehicles stay visible to buyers nearby." : "",
    };
  }
  if (value.includes("local")) {
    return {
      title: `You have ${n} service ${listingsWord} posted`,
      body: n ? "Customers can find your approved services on NAJIK." : "",
    };
  }
  return {
    title: `You have ${n} ${listingsWord} posted`,
    body: n ? "Your approved listings are live for buyers." : "",
  };
}

type Props = {
  name: string;
  photo: string;
  serviceType?: string;
  verified?: boolean;
  pending?: boolean;
  rejected?: boolean;
  variant?: "home" | "profile";
  location?: string;
  showPosted?: boolean;
  listingCount?: number;
  onPress?: () => void;
  onCamera?: () => void;
  onViewListing?: () => void;
};

export function SellerHeroBanner({
  name,
  photo,
  serviceType,
  verified,
  pending,
  rejected,
  variant = "home",
  showPosted,
  listingCount = 0,
  onPress,
  onCamera,
  onViewListing,
}: Props) {
  const home = variant === "home";
  const scene = serviceHeroPhoto(serviceType);
  const serviceLabel = serviceHeroTitle(serviceType);
  const posted = postedCopy(serviceType, listingCount);
  const showSuccessCard = Boolean(showPosted && listingCount > 0);
  const avatar = home ? AVATAR : 52;
  const badge = verified
    ? home
      ? "Verified Service Provider"
      : "Verified Provider"
    : pending
      ? "Pending verification"
      : rejected
        ? "Not approved"
        : "Service Provider";

  const info = (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <Avatar name={name} uri={photo || undefined} size={avatar} borderWidth={f(0.008, 3)} onCamera={onCamera} />

      <View style={{ flex: 1, marginLeft: f(0.025, 10), maxWidth: home ? 0.5 * W : undefined }}>
        <Text style={{ color: "#D8EDE2", fontSize: home ? f(0.026, 11) : 11 }}>Welcome Back,</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: f(0.014, 5), flexWrap: "wrap" }}>
          <Text
            style={{
              color: "#fff",
              fontSize: home ? f(0.045, 17) : 17,
              fontWeight: "800",
              letterSpacing: -0.3,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
          {verified && home ? (
            <View
              style={{
                width: f(0.038, 15),
                height: f(0.038, 15),
                borderRadius: f(0.019, 8),
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={f(0.026, 10)} color={GREEN} />
            </View>
          ) : null}
          <View
            style={{
              flexShrink: 0,
              backgroundColor: "#2E9B4A",
              paddingHorizontal: home ? f(0.017, 6) : 7,
              paddingVertical: home ? f(0.007, 3) : 3,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            {verified && !home ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
            <Text style={{ color: "#fff", fontSize: home ? f(0.0165, 7) : 9, fontWeight: "800" }} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        </View>
        <Text style={{ color: "#fff", fontSize: f(0.029, 12), marginTop: f(0.007, 3) }} numberOfLines={1}>
          {serviceLabel}
        </Text>
      </View>

      {!home ? <Ionicons name="chevron-forward" size={20} color="#fff" /> : null}
    </View>
  );

  if (!home) {
    return (
      <PressScale onPress={onPress}>
        <View style={{ borderRadius: R, backgroundColor: GREEN, padding: f(0.04, 14), ...shadow.card }}>{info}</View>
      </PressScale>
    );
  }

  return (
    <View>
      <View style={{ width: W, height: G_BOT, overflow: "hidden", borderBottomLeftRadius: R, borderBottomRightRadius: R }}>
        <Image
          source={scene.src}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: Math.round(0.58 * W),
            height: Math.round(LIFT + GREEN_H * 0.62),
            zIndex: 0,
          }}
          resizeMode="cover"
        />

        <Svg pointerEvents="none" width={W} height={G_BOT} style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}>
          <Path d={GREEN_PATH} fill={GREEN} />
        </Svg>

        <View style={{ height: GREEN_H, marginTop: LIFT, paddingLeft: f(0.045, 16), paddingTop: f(0.055, 20), zIndex: 2 }}>
          {info}

          <PressScale onPress={onPress} style={{ position: "absolute", right: f(0.035, 14), bottom: f(0.05, 18) }}>
            <View
              style={{
                backgroundColor: GREEN_DEEP,
                paddingHorizontal: f(0.028, 11),
                paddingVertical: f(0.014, 6),
                borderRadius: f(0.05, 18),
                flexDirection: "row",
                alignItems: "center",
                gap: f(0.012, 5),
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: f(0.022, 10) }}>View Profile</Text>
              <Ionicons name="arrow-forward" size={f(0.024, 11)} color="#fff" />
            </View>
          </PressScale>
        </View>
      </View>

      {showSuccessCard ? (
        <View
          style={{
            marginTop: f(0.01, 4),
            backgroundColor: "#fff",
            borderRadius: R,
            paddingHorizontal: f(0.028, 11),
            paddingVertical: f(0.026, 10),
            flexDirection: "row",
            alignItems: "center",
            gap: f(0.024, 9),
            ...shadow.card,
          }}
        >
          <View
            style={{
              width: f(0.087, 34),
              height: f(0.087, 34),
              borderRadius: f(0.0435, 17),
              backgroundColor: "#E4F6EA",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="megaphone" size={f(0.042, 17)} color="#1B7D2C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", color: colors.navy, fontSize: f(0.03, 12) }}>
              {posted.title}
            </Text>
            {posted.body ? (
              <Text style={{ color: colors.textSecondary, fontSize: f(0.025, 10) }}>
                {posted.body}
              </Text>
            ) : null}
          </View>
          <PressScale onPress={onViewListing}>
            <View
              style={{
                borderWidth: 1.5,
                borderColor: "#1B7D2C",
                paddingHorizontal: f(0.028, 11),
                paddingVertical: f(0.017, 7),
                borderRadius: f(0.05, 18),
                flexDirection: "row",
                alignItems: "center",
                gap: f(0.012, 5),
              }}
            >
              <Text style={{ color: "#1B7D2C", fontWeight: "800", fontSize: f(0.026, 11) }} numberOfLines={1}>
                View Listing
              </Text>
              <Ionicons name="arrow-forward" size={f(0.028, 12)} color="#1B7D2C" />
            </View>
          </PressScale>
        </View>
      ) : null}
    </View>
  );
}
