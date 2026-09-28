"""Detect whether staff login security tables are present (migrations 0002+)."""
from functools import lru_cache

from django.db import connection
from django.db.utils import DatabaseError, OperationalError, ProgrammingError

STAFF_AUTH_TABLES = (
    "staff_loginattempt",
    "staff_staffloginlockout",
    "staff_trusteddevice",
    "staff_emailverificationcode",
)


@lru_cache(maxsize=1)
def staff_auth_tables_ready() -> bool:
    try:
        tables = set(connection.introspection.table_names())
    except (DatabaseError, OperationalError, ProgrammingError):
        return False
    return all(name in tables for name in STAFF_AUTH_TABLES)


def clear_staff_auth_schema_cache() -> None:
    staff_auth_tables_ready.cache_clear()
