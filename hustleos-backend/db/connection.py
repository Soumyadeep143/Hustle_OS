import os
from contextlib import contextmanager
from typing import Iterator, Optional

import psycopg2
import psycopg2.extras
import psycopg2.pool

_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None


def _get_pool() -> psycopg2.pool.SimpleConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.SimpleConnectionPool(1, 10, dsn=os.environ["DATABASE_URL"])
    return _pool


@contextmanager
def get_cursor() -> Iterator[psycopg2.extras.RealDictCursor]:
    """Pooled Postgres cursor scoped to one unit of work: commits on success,
    rolls back on exception, always returns the connection to the pool."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
