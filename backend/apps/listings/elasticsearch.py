"""Optional Elasticsearch-backed listing search. Falls back to PostgreSQL when ES is off."""

from __future__ import annotations

import logging
from typing import Iterable

from django.conf import settings

logger = logging.getLogger(__name__)

INDEX = "najik_listings"
_client = None


def es_enabled() -> bool:
    return bool(getattr(settings, "ELASTICSEARCH_URL", "") or "")


def get_client():
    global _client
    if not es_enabled():
        return None
    if _client is None:
        try:
            from elasticsearch import Elasticsearch

            _client = Elasticsearch(settings.ELASTICSEARCH_URL, request_timeout=10)
            if not _client.ping():
                logger.warning("Elasticsearch ping failed")
                _client = False
        except Exception as exc:
            logger.warning("Elasticsearch client error: %s", exc)
            _client = False
    return _client if _client is not False else None


def ensure_index():
    client = get_client()
    if not client:
        return
    if client.indices.exists(index=INDEX):
        return
    client.indices.create(
        index=INDEX,
        settings={"number_of_shards": 1, "number_of_replicas": 0},
        mappings={
            "properties": {
                "title": {"type": "text", "analyzer": "standard"},
                "description": {"type": "text", "analyzer": "standard"},
                "location": {"type": "text"},
                "city": {"type": "keyword"},
                "district": {"type": "keyword"},
                "category": {"type": "keyword"},
                "subcategory": {"type": "keyword"},
                "price_digits": {"type": "long"},
                "status": {"type": "keyword"},
                "owner_id": {"type": "keyword"},
                "created_at": {"type": "date"},
            }
        },
    )


def listing_doc(listing) -> dict:
    digits = "".join(ch for ch in str(listing.price or "") if ch.isdigit())
    return {
        "title": listing.title or "",
        "description": listing.description or "",
        "location": listing.location or "",
        "city": listing.city or "",
        "district": listing.district or "",
        "category": listing.category or "",
        "subcategory": listing.subcategory or "",
        "price_digits": int(digits) if digits else 0,
        "status": listing.status,
        "owner_id": str(listing.owner_id),
        "created_at": listing.created_at.isoformat() if listing.created_at else None,
    }


def index_listing(listing) -> None:
    client = get_client()
    if not client:
        return
    ensure_index()
    try:
        client.index(index=INDEX, id=str(listing.id), document=listing_doc(listing))
    except Exception as exc:
        logger.warning("index_listing failed for %s: %s", listing.id, exc)


def delete_listing_index(listing_id) -> None:
    client = get_client()
    if not client:
        return
    try:
        client.delete(index=INDEX, id=str(listing_id), ignore=[404])
    except Exception as exc:
        logger.warning("delete_listing_index failed for %s: %s", listing_id, exc)


def search_listing_ids(
    q: str,
    *,
    category: str | None = None,
    status: str = "approved",
    limit: int = 200,
) -> list[str] | None:
    """Return listing IDs from ES, or None if ES unavailable (caller uses PostgreSQL)."""
    client = get_client()
    if not client or not (q or "").strip():
        return None
    ensure_index()
    must = [
        {"multi_match": {"query": q.strip(), "fields": ["title^3", "description", "location", "city", "district", "subcategory"], "fuzziness": "AUTO"}},
        {"term": {"status": status}},
    ]
    if category:
        must.append({"term": {"category": category}})
    try:
        res = client.search(
            index=INDEX,
            size=min(limit, 500),
            query={"bool": {"must": must}},
            sort=[{"created_at": "desc"}],
            _source=False,
        )
        return [hit["_id"] for hit in res.get("hits", {}).get("hits", [])]
    except Exception as exc:
        logger.warning("Elasticsearch search failed: %s", exc)
        return None


def bulk_index(listings: Iterable) -> int:
    client = get_client()
    if not client:
        return 0
    ensure_index()
    from elasticsearch.helpers import bulk

    actions = (
        {"_index": INDEX, "_id": str(row.id), "_source": listing_doc(row)}
        for row in listings
    )
    ok, _ = bulk(client, actions, raise_on_error=False)
    return ok
