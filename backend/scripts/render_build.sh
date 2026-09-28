#!/usr/bin/env bash
# Render BUILD command only — no database access (internal DB hostnames are not available here).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[najik] Installing Python dependencies..."
pip install -r requirements.txt

echo "[najik] Collecting static files (no DB required)..."
python manage.py collectstatic --noinput

echo "[najik] Build complete."
echo "[najik] Migrations run at START via scripts/render_start.sh — do not add migrate to Build Command."
