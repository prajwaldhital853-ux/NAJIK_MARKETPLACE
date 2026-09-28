#!/usr/bin/env bash
# Render START command — database is reachable here (not during build).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "========================================"
echo "[najik] START: database + migrate + gunicorn"
echo "========================================"

python scripts/wait_for_db.py

echo "[najik] Collecting static files..."
python manage.py collectstatic --noinput

echo "[najik] Applying database migrations..."
python manage.py migrate --noinput
python manage.py showmigrations staff | tail -n 6

# Seed default RBAC roles + 72 page permissions (idempotent — safe on every deploy).
echo "[najik] Ensuring RBAC + default staff accounts..."
python manage.py setup_page_rbac

# Optional: create/update super admin when env vars are set (idempotent).
if [[ -n "${STAFF_BOOTSTRAP_EMAIL:-}" && -n "${STAFF_BOOTSTRAP_PASSWORD:-}" ]]; then
  echo "[najik] Bootstrapping super admin (${STAFF_BOOTSTRAP_EMAIL})..."
  python manage.py create_super_admin \
    --email "$STAFF_BOOTSTRAP_EMAIL" \
    --password "$STAFF_BOOTSTRAP_PASSWORD" \
    --skip-default-staff
fi

# Demo marketplace: keep data when enabled; auto-seed empty DB on first deploy (no photos = fast).
if [[ "${DEMO_SEED_ENABLED:-false}" == "true" ]]; then
  echo "[najik] DEMO_SEED_ENABLED=true — ensuring demo listings exist..."
  python manage.py seed_demo_if_empty \
    --count "${DEMO_SEED_COUNT:-200}" \
    --listings-per-seller "${DEMO_LISTINGS_PER_SELLER:-5}" \
    || echo "[najik] WARNING: demo seed failed — use Admin Settings to retry"
else
  python manage.py purge_demo_sellers
fi

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
