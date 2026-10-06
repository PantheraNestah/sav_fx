import os

import httpx
import pytest
import pytest_asyncio

os.environ.setdefault("TICK_ENGINE_ENABLED", "false")
os.environ.setdefault("PROVIDER_BOT_ENABLED", "false")
os.environ.setdefault("BCRYPT_ROUNDS", "4")
os.environ.setdefault("ENV", "test")


@pytest.fixture
def settings_env(tmp_path, monkeypatch):
    """Fresh database file + cleared settings/limiter caches for every test."""
    from app import db, mailer
    from app.config import get_settings
    from app.routers import auth
    from app.services import trading

    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path}/test.db")
    get_settings.cache_clear()
    db.engine = None
    trading.reset_limiter()
    auth.reset_login_state()
    mailer.outbox.clear()
    yield monkeypatch
    get_settings.cache_clear()


@pytest_asyncio.fixture
async def app(settings_env):
    from app.main import create_app

    application = create_app()
    async with application.router.lifespan_context(application):
        yield application


@pytest_asyncio.fixture
async def client(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def engine(app):
    from app import runtime

    return runtime.get_engine()


async def register(client: httpx.AsyncClient, email="trader@example.com", name="Test Trader", password="correct horse"):
    r = await client.post("/api/auth/register", json={"fullName": name, "email": email, "password": password})
    assert r.status_code == 201, r.text
    return r.json()


def auth_headers(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['accessToken']}"}


@pytest_asyncio.fixture
async def user(client):
    """A registered user: (tokens, headers)."""
    tokens = await register(client)
    return tokens, auth_headers(tokens)


async def settle_with_digit(engine, symbol: str, digit: int, ticks: int = 1):
    """Advance the engine one tick and settle against a crafted price ending in `digit`."""
    from app.market.engine import TickEvent
    from app.services import trading

    st = engine.states[symbol]
    st.seq += ticks
    tick = TickEvent(symbol, st.seq, 0, 9600.00 + digit / 100)
    assert tick.digit == digit
    st.history.append(tick)
    return await trading.settle_tick(tick)
