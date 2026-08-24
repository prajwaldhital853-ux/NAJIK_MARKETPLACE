# Scaling NAJIK (10k users / 50k listings)

This document explains how the app stays fast at scale, why we use **SSE instead of polling** for admin, why **WebSockets are not the default**, and how **Elasticsearch** fits in.

## TL;DR

| Layer | Strategy |
|-------|----------|
| **Mobile buyer feed** | Paginated API + 20s server cache + on-device home cache (stale-while-revalidate) |
| **Mobile seller hub** | Load once, local event bus, ~20s background poll for own listings only |
| **Admin panel** | SSE push hints + targeted REST refetch; 60s full poll as fallback |
| **Search** | Elasticsearch when `ELASTICSEARCH_URL` is set; PostgreSQL `ILIKE` fallback |
| **Shared cache / push** | Redis when `REDIS_URL` is set |

Without Redis or ES the app still works — it is slower and does more redundant work.

---

## Polling vs SSE vs WebSockets

### What polling costs at scale

Every **15 seconds**, a naive admin dashboard might call 5–7 endpoints and download:

- 100 users
- 50 pending + 25 recent listings
- All KYC applications
- All open complaints
- Payment summary

Even when **nothing changed**, that is megabytes per hour per open admin tab, constant DB load, and JSON parsing in the browser. With **3 staff tabs** and **10k users / 50k listings**, PostgreSQL and gunicorn workers spend most of their time serving identical snapshots.

### SSE (what we ship today)

**Server-Sent Events** at `GET /api/admin/events/stream/` keep one long-lived HTTP connection open. When a listing is approved, KYC submitted, or a complaint filed, the API publishes a tiny event over **Redis pub/sub**:

```json
{ "type": "listings_changed", "payload": {} }
```

The admin client (`apps/admin/lib/event-stream.ts`) receives that hint and refetches **only the affected slice** (e.g. listings poll, not users + payments + complaints).

**Why this scales better than polling:**

- **Bandwidth**: ~50 bytes per event vs hundreds of KB per poll cycle
- **Database**: queries run when data actually changes (+ one 60s safety poll)
- **Latency**: staff see updates in sub-second time instead of waiting up to 15s
- **Deploy simplicity**: works with **gunicorn WSGI** — no second ASGI process

Without `REDIS_URL`, SSE sends heartbeats only; the client falls back to `ADMIN_POLL_FALLBACK_MS` (60s) full REST poll.

### WebSockets (not default)

WebSockets are **bidirectional** and great for chat, live bidding, or collaborative editing. For admin “something changed, refresh listings”, they add:

- Django **Channels** + **daphne/uvicorn** (second deployment model alongside gunicorn)
- Connection state per worker unless Redis layer is perfect
- More complex auth, reconnect, and proxy buffering (Render/nginx)

**SSE is sufficient** for staff dashboards (few concurrent connections, server → client only). We can add WebSockets later for in-app chat if needed.

### Mobile app

Opening a **WebSocket to every buyer/seller** at 10k DAU does not scale on a single Render instance (connection limits, memory, battery). The mobile path is:

1. **Paginated feed** (`limit` / cursor, compact card serializer)
2. **Short server cache** (~20s) + version bump on writes
3. **On-device cache** — show last home screen instantly, revalidate in background
4. **Push notifications** (future) for seller approval / messages — not constant socket

Seller hub polls **only the seller’s listings** every ~20s, not the full catalog.

---

## Elasticsearch

When `ELASTICSEARCH_URL` is set, text search on the buyer feed (`?q=`) uses ES instead of PostgreSQL `ILIKE`:

- **Faster** on large catalogs (inverted index vs sequential scan)
- **Better relevance** (tokenization, prefix, future fuzzy/synonyms)
- **Less DB load** — search traffic offloads from Postgres

Listings are indexed on create/update/delete via `sync_listing_search_index()` in `backend/apps/listings/elasticsearch.py`.

### Setup

1. Provision Elasticsearch (Elastic Cloud, Bonsai, self-hosted).
2. Set `ELASTICSEARCH_URL` in backend env.
3. Run once after deploy or bulk import:

   ```bash
   python manage.py reindex_listings
   ```

4. Optional: `--batch-size 500` for large catalogs.

If ES is down or unset, search falls back to PostgreSQL automatically.

---

## Redis

Set `REDIS_URL` to enable:

1. **Django cache** shared across gunicorn workers (feed cache, listing counts)
2. **Realtime pub/sub** for admin SSE (`publish_event` in `backend/apps/core/realtime.py`)

Events published today:

- `listings_changed` — listing create/update/moderation
- `applications_changed` — KYC save
- `complaints_changed` — report save

---

## Capacity rough guide

These are order-of-magnitude targets on a small Render Postgres + 1 web service, **with** pagination, cache, and optional Redis/ES:

| Scale | Expected behavior |
|-------|-------------------|
| 100 users, 500 listings | Snappy; demo seed OK |
| 1k users, 5k listings | Fine with cache; enable Redis for multi-worker |
| 10k users, 50k listings | Needs Redis + ES for search; admin uses SSE; no full-table loads |
| 100k+ listings | Dedicated ES cluster, read replicas, CDN for images |

The app should **not** crash or take minutes to open if the above patterns are used. Slow paths to avoid:

- Loading entire listing table for feed boost or admin tables
- 15s full admin poll with unpaginated arrays
- `ILIKE '%query%'` on 50k rows without ES

---

## Environment variables

See `backend/.env.render.example`:

- `REDIS_URL` — shared cache + admin SSE
- `ELASTICSEARCH_URL` — optional search index
- `ADMIN_SSE_HEARTBEAT_S` — SSE keepalive (default 25)

---

## Related code

| File | Role |
|------|------|
| `backend/apps/core/views/realtime.py` | Admin SSE endpoint |
| `backend/apps/core/realtime.py` | Redis publish/subscribe |
| `backend/apps/listings/elasticsearch.py` | ES client + indexing |
| `backend/apps/listings/management/commands/reindex_listings.py` | Bulk reindex |
| `apps/admin/lib/event-stream.ts` | Admin SSE client |
| `apps/admin/lib/store.tsx` | SSE-driven partial refetch |
| `apps/mobile/src/cache/homeCache.ts` | Mobile stale-while-revalidate |
