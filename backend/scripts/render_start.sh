#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python manage.py migrate --noinput

# Seed default RBAC roles + 72 page permissions (idempotent — safe on every deploy).
python manage.py setup_page_rbac

# Optional load-test demo data (set NAJIK_LOAD_TEST_SEED in Render env — no shell needed).
# Example: NAJIK_LOAD_TEST_SEED=5000
LOAD_TEST_TARGET="${NAJIK_LOAD_TEST_SEED:-0}"
if [[ "${LOAD_TEST_TARGET}" =~ ^[1-9][0-9]*$ ]]; then
  echo "NAJIK_LOAD_TEST_SEED=${LOAD_TEST_TARGET} — ensuring demo sellers/listings exist…"
  python manage.py seed_demo_sellers \
    --count "${LOAD_TEST_TARGET}" \
    --listings-per-seller 1 \
    --fast \
    --skip-if-enough
else
  # Remove any demo sellers left from old auto-seed deploys (idempotent, fast when empty).
  python manage.py purge_demo_sellers
fi

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
