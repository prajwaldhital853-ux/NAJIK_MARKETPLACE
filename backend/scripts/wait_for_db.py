"""Wait for Postgres before migrate (Render start command). Fails fast on bad DATABASE_URL."""
import os
import socket
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

# Running as `python scripts/wait_for_db.py` — ensure backend/ is on sys.path for `config`.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _db_host() -> str:
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        print("[najik] ERROR: DATABASE_URL is not set on this Render service.")
        print("Link your Postgres database in Render -> Web Service -> Environment.")
        sys.exit(1)
    normalized = url.replace("postgres://", "postgresql://", 1)
    host = urlparse(normalized).hostname or ""
    if not host:
        print("[najik] ERROR: DATABASE_URL is set but has no hostname.")
        sys.exit(1)
    return host


def _host_resolves(host: str) -> bool:
    try:
        socket.getaddrinfo(host, 5432, type=socket.SOCK_STREAM)
        return True
    except socket.gaierror:
        return False


def main() -> None:
    host = _db_host()
    print(f"[najik] DATABASE_URL host: {host}")

    if not _host_resolves(host):
        print(f"[najik] ERROR: Cannot resolve database host '{host}'.")
        print("This usually means:")
        print("  1) The Render Postgres instance was deleted or recreated — copy the new")
        print("     Internal Database URL into Web Service -> Environment -> DATABASE_URL.")
        print("  2) migrate is running in the BUILD command — move it to START only:")
        print("     Build Command:  pip install -r requirements.txt")
        print("     Start Command:  bash scripts/render_start.sh")
        sys.exit(1)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django

    django.setup()
    from django.db import connection
    from django.db.utils import OperationalError

    for attempt in range(1, 16):
        try:
            connection.ensure_connection()
            print("[najik] Database connection OK.")
            return
        except OperationalError as exc:
            print(f"[najik] DB not ready ({attempt}/15): {exc}")
            time.sleep(2)

    print("[najik] ERROR: Postgres host resolves but connection failed after 30s.")
    print("Check Render Postgres is running and DATABASE_URL credentials are current.")
    sys.exit(1)


if __name__ == "__main__":
    main()
