import type { CatalogItem, CatalogKey } from "./catalog";

/** Related search / browse phrases by category (Hamro Bazar style). */
const RELATED_PHRASES: Record<CatalogKey, string[]> = {
  property: [
    "House for rent",
    "Room near me",
    "Land for sale",
    "Flat for rent",
    "Apartment",
    "Office space",
    "House for sale",
    "Plot",
  ],
  vehicles: ["Car for sale", "Bike", "Scooter", "Jeep", "Motorcycle", "Electric vehicle"],
  jobs: ["Full time jobs", "Part time", "IT jobs", "Office jobs", "Remote jobs", "Internship"],
  services: ["Home service", "Plumbing", "Electrician", "Cleaning", "Tutor", "Repair"],
  shops: ["Shop for rent", "Retail space", "Grocery", "Store"],
  electronics: ["Mobile phone", "Laptop", "TV", "Gadgets", "Appliances"],
  used: ["Furniture", "Used items", "Fashion", "Home items", "Books"],
  others: ["Near me", "Local ads"],
};

const KEYWORD_GROUPS: Record<CatalogKey, string[][]> = {
  property: [
    ["house", "home", "villa", "bungalow"],
    ["room", "single room", "shared"],
    ["flat", "apartment", "bhk"],
    ["land", "plot", "aana", "ropani", "kattha"],
    ["rent", "rental", "for rent"],
    ["sale", "for sale", "selling"],
    ["office", "workspace", "commercial"],
  ],
  vehicles: [
    ["car", "suv", "sedan", "jeep"],
    ["bike", "motorcycle", "scooter"],
    ["electric", "ev"],
    ["sale", "for sale"],
  ],
  jobs: [
    ["full time", "full-time"],
    ["part time", "part-time"],
    ["remote", "work from home"],
    ["it", "developer", "software"],
    ["office", "admin", "accountant"],
    ["internship", "intern"],
  ],
  services: [
    ["plumb", "plumber"],
    ["electric", "electrician"],
    ["clean", "cleaning"],
    ["tutor", "tuition", "teaching"],
    ["repair", "fix", "service"],
  ],
  shops: [["shop", "store", "retail"], ["rent", "for rent"], ["grocery"]],
  electronics: [
    ["phone", "mobile", "iphone", "samsung"],
    ["laptop", "macbook", "computer"],
    ["tv", "television"],
    ["appliance", "fridge", "washing"],
  ],
  used: [["furniture", "sofa", "bed"], ["fashion", "clothes"], ["used", "second hand"]],
  others: [["near", "local"]],
};

function haystack(item: CatalogItem) {
  return `${item.title} ${item.tags.join(" ")} ${item.extra.join(" ")} ${item.location} ${item.key}`.toLowerCase();
}

function tokensFromText(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

/** Keyword chips shown under Similar section for this listing. */
export function relatedKeywordsFor(item: CatalogItem, live?: { subcategory?: string; extras?: Record<string, unknown> } | null) {
  const phrases = [...RELATED_PHRASES[item.key]];
  const sub = String(live?.subcategory || item.tags[0] || "").trim();
  const deal = String(live?.extras?.dealType || "").trim();
  const extras: string[] = [];
  if (sub) extras.push(sub);
  if (deal) extras.push(deal);

  const text = haystack(item);
  for (const group of KEYWORD_GROUPS[item.key] || []) {
    if (group.some((word) => text.includes(word))) {
      const label = RELATED_PHRASES[item.key].find((p) => group.some((w) => p.toLowerCase().includes(w))) || group[0];
      if (label) extras.push(label.charAt(0).toUpperCase() + label.slice(1));
    }
  }

  const city = item.location.split(",")[0]?.trim();
  if (city && city.length > 2) extras.push(`${city} near me`);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...extras, ...phrases]) {
    const label = raw.replace(/\s+/g, " ").trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= 10) break;
  }
  return out;
}

function scoreRelated(candidate: CatalogItem, source: CatalogItem, focusKeywords: string[]) {
  if (candidate.id === source.id) return -1;
  let score = 0;
  if (candidate.key === source.key) score += 4;
  const text = haystack(candidate);
  const sourceTokens = new Set(tokensFromText(`${source.title} ${source.tags.join(" ")} ${source.extra.join(" ")}`));
  for (const token of sourceTokens) {
    if (text.includes(token)) score += 2;
  }
  for (const kw of focusKeywords) {
    const needle = kw.toLowerCase();
    if (needle.length > 2 && text.includes(needle)) score += 5;
  }
  // Same city / area boost
  const srcCity = source.location.split(",")[0]?.trim().toLowerCase();
  if (srcCity && candidate.location.toLowerCase().includes(srcCity)) score += 3;
  if (candidate.verified) score += 1;
  return score;
}

/** Rank all same-category (and keyword-related) listings for the Similar section. */
export function rankSimilarListings(
  pool: CatalogItem[],
  source: CatalogItem,
  options?: { keyword?: string | null },
) {
  const focus = options?.keyword ? [options.keyword] : relatedKeywordsFor(source);
  return pool
    .map((row) => ({ row, score: scoreRelated(row, source, focus) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title))
    .map((entry) => entry.row);
}
