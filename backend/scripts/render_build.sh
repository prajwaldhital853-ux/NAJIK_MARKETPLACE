#!/usr/bin/env bash
# Render BUILD — pip install ONLY. No manage.py (no DB, no migrate, no collectstatic).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "========================================"
echo "[najik] BUILD: pip install only"
echo "========================================"
pip install -r requirements.txt
echo "[najik] BUILD complete — migrate runs at START in render_start.sh"
