import type { CatalogItem } from "./catalog";
import type { ApiListing } from "../listingsApi";
import { listingsToCatalog } from "./liveListings";
import { rankSimilarListings } from "./similarListings";

/** Non-urgent catalog rows preserving API feed order (boosted listings first from backend). */
export function catalogFromFeed(rows: ApiListing[] | undefined | null) {
  return listingsToCatalog(Array.isArray(rows) ? rows : []).filter((item) => !item.urgent);
}

export function isPromotedItem(item: CatalogItem) {
  return Boolean(item.promoted);
}

/** Keep promoted items in API order at the front; organic items follow without reordering promoted rows. */
export function prioritizePromoted(items: CatalogItem[]) {
  const promoted: CatalogItem[] = [];
  const organic: CatalogItem[] = [];
  for (const item of items) {
    if (isPromotedItem(item)) promoted.push(item);
    else organic.push(item);
  }
  return [...promoted, ...organic];
}

export function buildRecommendedFromFeed(
  feedOrdered: CatalogItem[],
  pool: CatalogItem[],
  seeds: CatalogItem[],
  excludeIds: Set<string>,
  limit = 10,
) {
  const promoted = feedOrdered.filter(isPromotedItem);
  const promotedIds = new Set(promoted.map((row) => row.id));
  const exclude = new Set([...excludeIds, ...promotedIds]);

  const out: CatalogItem[] = [...promoted];
  const seen = new Set(out.map((row) => row.id));

  for (const seed of seeds) {
    const related = rankSimilarListings(pool, seed).filter((row) => !seen.has(row.id) && !row.urgent && !exclude.has(row.id));
    for (const row of related) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
      if (out.length >= limit) return out;
    }
  }

  for (const row of feedOrdered) {
    if (seen.has(row.id) || row.urgent || exclude.has(row.id) || isPromotedItem(row)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }

  for (const row of pool) {
    if (seen.has(row.id) || row.urgent || exclude.has(row.id)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}
