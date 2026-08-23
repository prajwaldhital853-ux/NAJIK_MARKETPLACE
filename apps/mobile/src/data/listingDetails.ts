import { adsCount, sellerPhone, type CatalogItem, type CatalogKey } from "./catalog";
import { liveSpecs, uniqueLabels } from "./liveListings";
import type { ApiListing } from "../listingsApi";

const img = {
  house: require("../../assets/listings/house.jpg"),
  flat: require("../../assets/listings/flat.jpg"),
  apartment: require("../../assets/listings/apartment.jpg"),
  modern: require("../../assets/listings/modern.jpg"),
  land: require("../../assets/listings/land.jpg"),
  building: require("../../assets/listings/building.jpg"),
  office: require("../../assets/listings/office.jpg"),
  shop: require("../../assets/listings/shop.jpg"),
  car: require("../../assets/listings/car.jpg"),
  bike: require("../../assets/listings/bike.jpg"),
  jobs: require("../../assets/listings/jobs.jpg"),
  tools: require("../../assets/listings/tools.jpg"),
  services: require("../../assets/listings/services.jpg"),
  phone: require("../../assets/listings/phone.jpg"),
};

const pools: Record<CatalogKey, number[]> = {
  property: [img.house, img.flat, img.apartment, img.modern, img.building, img.office, img.land, img.shop],
  vehicles: [img.car, img.bike, img.office, img.shop, img.tools, img.building],
  jobs: [img.jobs, img.office, img.shop, img.building, img.modern],
  services: [img.tools, img.services, img.house, img.office, img.shop],
  shops: [img.shop, img.phone, img.office, img.building, img.house],
  electronics: [img.phone, img.office, img.shop, img.tools, img.modern],
  used: [img.modern, img.office, img.house, img.bike, img.flat],
  others: [img.office, img.services, img.jobs, img.shop, img.building],
};

export type SpecRow = { label: string; value: string };
export type Amenity = { icon: string; label: string };
export type Review = { name: string; rating: number; text: string; time: string; helpful: number };
export type Faq = { q: string; a: string };

export type ListingRich = {
  gallery: (number | { uri: string })[];
  rating: number;
  reviewCount: number;
  views: number;
  saved: number;
  negotiable: boolean;
  highlights: string[];
  description: string;
  specs: SpecRow[];
  amenities: Amenity[];
  faqs: Faq[];
  reviews: Review[];
  seller: { name: string; role: string; listed: string; response: string; rating: string; phone: string; ads: number; ownerId?: string; photoUrl?: string | null };
  variants?: { label: string; options: string[] };
  cta: string;
};

function uniqueGallery(main: number, rest: number[]) {
  const out = [main];
  rest.forEach((photo) => {
    if (!out.includes(photo)) out.push(photo);
  });
  return out.slice(0, 6);
}

const reviewsSeed: Review[] = [];

const byKey: Record<CatalogKey, Omit<ListingRich, "gallery" | "seller">> = {
  property: {
    rating: 4.8,
    reviewCount: 36,
    views: 248,
    saved: 41,
    negotiable: true,
    highlights: ["Verified listing", "Ready to visit", "Clear documents", "Prime location"],
    description:
      "A well-kept home in a quiet lane of Lahan, close to schools, shops and the main road. Bright rooms, tiled floors and a practical kitchen. Water and electricity are regular. Ideal for a family looking to buy or move in without extra work.\n\nThe neighbourhood is residential, with parking on the street and a small yard at the front. You can visit any day after a quick chat with the owner on NAJIK.",
    specs: [
      { label: "Type", value: "Residential" },
      { label: "Furnishing", value: "Semi-furnished" },
      { label: "Floor", value: "Ground + 1" },
      { label: "Facing", value: "East" },
      { label: "Water", value: "Boring + supply" },
      { label: "Parking", value: "1 car / 2 bikes" },
      { label: "Ownership", value: "Freehold" },
      { label: "Age", value: "6 years" },
    ],
    amenities: [
      { icon: "water-outline", label: "Water" },
      { icon: "flash-outline", label: "Electricity" },
      { icon: "car-outline", label: "Parking" },
      { icon: "leaf-outline", label: "Garden" },
      { icon: "shield-checkmark-outline", label: "Safe area" },
      { icon: "wifi-outline", label: "Wi-Fi ready" },
    ],
    faqs: [
      { q: "Is the price negotiable?", a: "Yes. Serious buyers can discuss a final price during a site visit." },
      { q: "Can I visit this week?", a: "The owner is available most evenings. Use Call or Chat to pick a time." },
      { q: "Are papers clear?", a: "Lalpurja and tax receipts are ready to show during the visit." },
    ],
    reviews: reviewsSeed,
    variants: { label: "Deal type", options: ["Buy now", "Schedule visit"] },
    cta: "Schedule visit",
  },
  vehicles: {
    rating: 4.6,
    reviewCount: 22,
    views: 186,
    saved: 29,
    negotiable: true,
    highlights: ["Single owner", "Service history", "No major accidents", "Test drive in Lahan"],
    description:
      "Clean local vehicle with regular servicing. Tyres, battery and papers are in order. You can inspect and take a short test drive around Lahan after confirming with the seller.\n\nPrice is close to market for the year and kilometres shown. Bring a mechanic if you want a second opinion — the owner is happy to wait.",
    specs: [
      { label: "Year", value: "See listing" },
      { label: "Fuel", value: "Petrol / Diesel" },
      { label: "Transmission", value: "See details" },
      { label: "KM driven", value: "See details" },
      { label: "Owners", value: "1st owner" },
      { label: "Insurance", value: "Valid" },
      { label: "Colour", value: "Factory" },
      { label: "Registration", value: "Province 2" },
    ],
    amenities: [
      { icon: "speedometer-outline", label: "Test drive" },
      { icon: "document-text-outline", label: "Papers ready" },
      { icon: "construct-outline", label: "Serviced" },
      { icon: "shield-outline", label: "Insurance" },
      { icon: "car-sport-outline", label: "AC" },
      { icon: "musical-notes-outline", label: "Audio" },
    ],
    faqs: [
      { q: "Can I test drive?", a: "Yes, with a valid licence. Chat the seller to set a time in Lahan." },
      { q: "Any bank finance?", a: "Seller can share papers needed for a local bank loan." },
    ],
    reviews: reviewsSeed,
    variants: { label: "How to buy", options: ["Cash", "Bank loan", "Exchange"] },
    cta: "Book test drive",
  },
  jobs: {
    rating: 4.7,
    reviewCount: 18,
    views: 312,
    saved: 54,
    negotiable: false,
    highlights: ["Walk-in or apply", "Local employer", "Salary on time", "Growth role"],
    description:
      "A nearby opening for someone who can start soon. The team is small, so you will handle real work from week one. Hours and pay are as listed. Bring your CV or apply by chat.\n\nInterviews are usually in Lahan within a few days. Remote options are noted on the card when available.",
    specs: [
      { label: "Type", value: "See tags" },
      { label: "Experience", value: "1–3 years" },
      { label: "Education", value: "Plus 2 / Bachelor" },
      { label: "Shift", value: "Day" },
      { label: "Openings", value: "2 seats" },
      { label: "Joining", value: "Immediate" },
    ],
    amenities: [
      { icon: "time-outline", label: "Day shift" },
      { icon: "cash-outline", label: "Monthly pay" },
      { icon: "people-outline", label: "Small team" },
      { icon: "school-outline", label: "Training" },
      { icon: "bicycle-outline", label: "Leave policy" },
      { icon: "cafe-outline", label: "Staff tea" },
    ],
    faqs: [
      { q: "Do I need to apply online?", a: "You can Call or Chat with your name and experience. A CV photo is enough to start." },
      { q: "Is this full time?", a: "Check the tags on this job. Full time roles are on-site unless marked Remote." },
    ],
    reviews: reviewsSeed,
    variants: { label: "Apply as", options: ["Full time", "Part time", "Internship"] },
    cta: "Apply now",
  },
  services: {
    rating: 4.8,
    reviewCount: 120,
    views: 410,
    saved: 67,
    negotiable: false,
    highlights: ["Same-day slot", "Verified provider", "Tools included", "Warranty on work"],
    description:
      "Book a trusted local provider for a visit at your home or shop. Pricing is per visit unless a bigger job is quoted after inspection.\n\nMost jobs in Lahan can be started the same day if you chat before noon. Spare parts, if needed, are discussed before any extra charge.",
    specs: [
      { label: "Visit fee", value: "As listed" },
      { label: "Area", value: "Lahan & nearby" },
      { label: "Hours", value: "8am – 7pm" },
      { label: "Warranty", value: "7–30 days" },
      { label: "Payment", value: "Cash / eSewa" },
      { label: "Team", value: "Licensed" },
    ],
    amenities: [
      { icon: "flash-outline", label: "Same day" },
      { icon: "shield-checkmark-outline", label: "Verified" },
      { icon: "construct-outline", label: "Own tools" },
      { icon: "card-outline", label: "eSewa" },
      { icon: "star-outline", label: "Top rated" },
      { icon: "time-outline", label: "On time" },
    ],
    faqs: [
      { q: "What is included in the visit fee?", a: "Inspection and basic labour. Parts are extra and agreed before fitting." },
      { q: "Do you cover Golbazar?", a: "Yes, with a small travel add-on. Confirm in chat." },
    ],
    reviews: reviewsSeed,
    variants: { label: "When", options: ["Today", "Tomorrow", "This week"] },
    cta: "Book visit",
  },
  shops: {
    rating: 4.5,
    reviewCount: 14,
    views: 132,
    saved: 19,
    negotiable: true,
    highlights: ["Main road access", "Customer flow", "Power backup", "Flexible terms"],
    description:
      "A practical shop or store listing in a busy part of town. Foot traffic is strong in the evenings. Rent or sale terms are on the card.\n\nYou can walk through the space, check shutters and discuss deposit with the owner on a short visit.",
    specs: [
      { label: "Frontage", value: "Main facing" },
      { label: "Power", value: "Meter + backup" },
      { label: "Washroom", value: "Shared / own" },
      { label: "Deposit", value: "2 months" },
      { label: "Use", value: "Retail / office" },
      { label: "Hours", value: "Open listing" },
    ],
    amenities: [
      { icon: "storefront-outline", label: "Shutter" },
      { icon: "people-outline", label: "Footfall" },
      { icon: "flash-outline", label: "Power" },
      { icon: "car-outline", label: "Unload" },
      { icon: "wifi-outline", label: "Net ready" },
      { icon: "camera-outline", label: "CCTV" },
    ],
    faqs: [
      { q: "Can I run any business?", a: "Retail and services are fine. Food or workshop use needs owner approval." },
    ],
    reviews: reviewsSeed,
    variants: { label: "Interest", options: ["Visit shop", "Ask rent", "Ask sale"] },
    cta: "Visit shop",
  },
  electronics: {
    rating: 4.6,
    reviewCount: 41,
    views: 275,
    saved: 38,
    negotiable: true,
    highlights: ["Checked device", "Box / charger", "Local pickup", "7-day check"],
    description:
      "Inspected gadget listed by a nearby seller. Battery, screen and buttons were checked before posting. Meet in a public place in Lahan or at the shop.\n\nYou can test the device before you pay. No shipping in this demo — pickup only.",
    specs: [
      { label: "Condition", value: "Excellent" },
      { label: "Warranty", value: "Seller 7 days" },
      { label: "Box", value: "Yes / charger" },
      { label: "Bill", value: "Available" },
      { label: "Pickup", value: "Lahan bazaar" },
      { label: "Returns", value: "If not as described" },
    ],
    amenities: [
      { icon: "battery-charging-outline", label: "Battery OK" },
      { icon: "phone-portrait-outline", label: "Screen OK" },
      { icon: "cube-outline", label: "Box" },
      { icon: "checkmark-circle-outline", label: "Tested" },
      { icon: "swap-horizontal-outline", label: "Meetup" },
      { icon: "lock-closed-outline", label: "Safe pay" },
    ],
    faqs: [
      { q: "Is it unlocked?", a: "Yes for phones in this demo. Confirm IMEI in person." },
      { q: "Can you hold it for me?", a: "A small token via chat can hold it until evening." },
    ],
    reviews: reviewsSeed,
    variants: { label: "Storage / colour", options: ["As listed", "Ask other variant"] },
    cta: "Buy / meetup",
  },
  used: {
    rating: 4.4,
    reviewCount: 11,
    views: 97,
    saved: 16,
    negotiable: true,
    highlights: ["Used — good", "Pickup in Lahan", "Can deliver nearby", "Photos of wear"],
    description:
      "Second-hand item from a local home. Wear is normal for the age. You can see it before paying. Help with loading is usually available.\n\nCash on pickup is preferred. A small delivery fee may apply outside Lahan-5.",
    specs: [
      { label: "Condition", value: "Used — good" },
      { label: "Age", value: "2–4 years" },
      { label: "Delivery", value: "Pickup / nearby" },
      { label: "Material", value: "See photos" },
      { label: "Reason", value: "Moving / upgrade" },
      { label: "Returns", value: "No, as-is" },
    ],
    amenities: [
      { icon: "cube-outline", label: "Pickup" },
      { icon: "car-outline", label: "Help load" },
      { icon: "cash-outline", label: "Cash" },
      { icon: "images-outline", label: "Real photos" },
    ],
    faqs: [{ q: "Any scratches?", a: "Minor wear as in the extra photos. Nothing structural." }],
    reviews: reviewsSeed,
    variants: { label: "Get it", options: ["Pickup today", "This weekend"] },
    cta: "Reserve item",
  },
  others: {
    rating: 4.5,
    reviewCount: 9,
    views: 64,
    saved: 11,
    negotiable: true,
    highlights: ["Local only", "Chat for custom quote", "Flexible dates"],
    description:
      "A local listing that does not sit in the usual categories. Read the highlights, then chat to confirm date, size and price.\n\nMost providers in this section work across Lahan and Siraha with a day’s notice.",
    specs: [
      { label: "Area", value: "Lahan / Siraha" },
      { label: "Notice", value: "1 day" },
      { label: "Payment", value: "Advance + rest" },
    ],
    amenities: [
      { icon: "calendar-outline", label: "Flexible" },
      { icon: "people-outline", label: "Group OK" },
      { icon: "chatbubble-outline", label: "Custom quote" },
    ],
    faqs: [{ q: "Can I get a quote?", a: "Yes. Send date and headcount in Chat." }],
    reviews: reviewsSeed,
    variants: { label: "Need", options: ["This week", "This month", "Ask quote"] },
    cta: "Get quote",
  },
};

export function galleryFor(item: CatalogItem) {
  if (!item.photo) return [];
  if (typeof item.photo !== "number") return [item.photo];
  return uniqueGallery(item.photo, pools[item.key] ?? pools.property);
}

export function richFor(item: CatalogItem, live?: ApiListing | null): ListingRich {
  const base = byKey[item.key];
  if (live) {
    const features = Array.isArray(live.extras?.features) ? live.extras.features.map(String) : [];
    const reviews = (live.reviews || []).map((review) => ({
      name: review.author_name || "Buyer",
      rating: review.rating,
      text: review.text,
      time: new Date(review.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      helpful: 0,
    }));
    const avg = live.rating_avg || (reviews.length ? reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length : 0);
    const photos = live.photos || [];
    return {
      gallery: photos.map((photo) => ({ uri: photo.url })),
      rating: avg,
      reviewCount: live.review_count || reviews.length,
      views: live.view_count || 0,
      saved: live.save_count || 0,
      negotiable: Boolean(live.negotiable),
      highlights: uniqueLabels(features),
      description: (live.description || "").trim() || "No description added.",
      specs: liveSpecs(live),
      amenities: uniqueLabels(features).map((label) => ({ icon: "checkmark-outline", label })),
      faqs: [],
      reviews,
      seller: {
        name: live.owner_name || item.company || "NAJIK Seller",
        role: live.seller_verified ? "Verified seller" : "Listed on NAJIK",
        listed: live.created_at ? new Date(live.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
        response: "Replies on NAJIK",
        rating: avg ? avg.toFixed(1) : "0",
        phone: live.contact_phone || "",
        ads: live.review_count || reviews.length || 1,
        ownerId: live.owner_id,
        photoUrl: live.owner_photo_url || null,
      },
      cta: "Contact seller",
    };
  }
  const specs = item.extra.length
    ? [
        ...item.extra.map((row) => {
          const m = row.match(/^([\d,.]+)\s+(.+)$/);
          if (m) return { label: m[2], value: m[1] };
          return { label: row, value: "Listed" };
        }),
        ...base.specs,
      ].slice(0, 8)
    : base.specs;

  return {
    ...base,
    specs: uniqueSpecs(specs),
    gallery: galleryFor(item),
    seller: {
      name: item.company || "NAJIK Seller",
      role: item.key === "jobs" ? "Hiring on NAJIK" : "Listed on NAJIK",
      listed: `${adsCount(item)} ads`,
      response: "Replies in minutes",
      rating: String(base.rating),
      phone: sellerPhone(),
      ads: adsCount(item),
    },
  };
}

function uniqueSpecs(rows: SpecRow[]) {
  const seen = new Set<string>();
  const out: SpecRow[] = [];
  rows.forEach((row) => {
    const key = row.label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  return out;
}

export function photoCountFor(item: CatalogItem) {
  return galleryFor(item).length;
}
