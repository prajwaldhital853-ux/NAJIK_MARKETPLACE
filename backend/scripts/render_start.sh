#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python manage.py migrate --noinput

# Do not block gunicorn on seed (Render kills the service if PORT is not bound quickly).
# Photos/listings fill in the background after the API is already up. No SSH needed.
if [[ "${SEED_DEMO_SELLERS:-1}" != "0" ]]; then
  (
    echo "[seed] $(date -u +%Y-%m-%dT%H:%M:%SZ) starting seed_demo_sellers"
    python manage.py seed_demo_sellers --count "${DEMO_SELLER_COUNT:-100}"
    echo "[seed] $(date -u +%Y-%m-%dT%H:%M:%SZ) finished"
  ) >> /tmp/seed_demo_sellers.log 2>&1 &
fi

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
