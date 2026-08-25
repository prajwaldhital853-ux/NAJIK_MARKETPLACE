#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python manage.py migrate --noinput

# Seed default RBAC roles + 72 page permissions (idempotent — safe on every deploy).
python manage.py setup_page_rbac

# Remove any demo sellers left from old auto-seed deploys (idempotent, fast when empty).
python manage.py purge_demo_sellers

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
