#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python manage.py migrate --noinput

# Demo sellers/listings for production feed (idempotent — safe on every deploy)
if [[ "${SEED_DEMO_SELLERS:-1}" != "0" ]]; then
  python manage.py seed_demo_sellers --count "${DEMO_SELLER_COUNT:-100}" || echo "[warn] seed_demo_sellers failed (continuing)"
fi

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
