"""Async SQLAlchemy engine/session plumbing. SQLite by default, Postgres via DATABASE_URL."""

import asyncio
from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


# Serialises balance-affecting work inside this process. The UPDATE ... WHERE
# amount >= stake guard in services.ledger keeps balances correct even without
# it (multi-process / Postgres); the lock mostly avoids SQLite "database is locked".
write_lock = asyncio.Lock()

engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


def configure(url: str) -> AsyncEngine:
    global engine, session_factory, write_lock
    write_lock = asyncio.Lock()  # bind to the current event loop's lifetime
    kwargs: dict = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"timeout": 30}
        if ":memory:" in url or url.endswith("sqlite+aiosqlite://"):
            kwargs["poolclass"] = StaticPool
    engine = create_async_engine(url, **kwargs)

    if url.startswith("sqlite"):

        @event.listens_for(engine.sync_engine, "connect")
        def _pragmas(dbapi_conn, _record):  # pragma: no cover - trivial
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            if ":memory:" not in url:
                cur.execute("PRAGMA journal_mode=WAL")
            cur.close()

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    return engine


async def create_all() -> None:
    from . import models  # noqa: F401  (register tables)

    assert engine is not None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose() -> None:
    global engine, session_factory
    if engine is not None:
        await engine.dispose()
    engine = None
    session_factory = None


async def get_session() -> AsyncIterator[AsyncSession]:
    assert session_factory is not None, "database not configured"
    async with session_factory() as session:
        yield session


def new_session() -> AsyncSession:
    assert session_factory is not None, "database not configured"
    return session_factory()
