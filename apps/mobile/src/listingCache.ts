import type { ApiListing } from "./listingsApi";

const TTL_MS = 5 * 60 * 1000;
const detail = new Map<string, { row: ApiListing; at: number }>();
const inflight = new Map<string, Promise<ApiListing>>();

export function peekListingDetail(id: string) {
  const hit = detail.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    detail.delete(id);
    return null;
  }
  return hit.row;
}

export function rememberListingDetail(row: ApiListing) {
  detail.set(row.id, { row, at: Date.now() });
}

export function rememberListingFeed(rows: ApiListing[]) {
  rows.forEach(rememberListingDetail);
}

export function prefetchListingDetail(loader: (id: string) => Promise<ApiListing>, id: string) {
  if (!id || peekListingDetail(id) || inflight.has(id)) return;
  const task = loader(id)
    .then((row) => {
      rememberListingDetail(row);
      return row;
    })
    .finally(() => {
      inflight.delete(id);
    });
  inflight.set(id, task);
}
