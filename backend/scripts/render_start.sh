#!/usr/bin/env bash
# Render START command — database is reachable here (not during build).
set -euo pipefail
cd "$(dirname "$0")/.."

python scripts/wait_for_db.py

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

# Remove any demo sellers left from old auto-seed deploys (idempotent, fast when empty).
python manage.py purge_demo_sellers

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
