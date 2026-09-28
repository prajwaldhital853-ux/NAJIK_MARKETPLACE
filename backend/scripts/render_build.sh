#!/usr/bin/env bash
# Render BUILD command only — no database access (internal DB hostnames are not available here).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[najik] Installing Python dependencies..."
pip install -r requirements.txt

echo "[najik] Build complete (migrations run at start via render_start.sh)."
