import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import db, runtime
from .config import get_settings
from .events import hub
from .market.engine import MarketEngine
from .routers import account, auth, copy_trading, market, settings, trades, ws
from .services import copy, trading

log = logging.getLogger("dash")


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    if db.engine is None:
        db.configure(cfg.database_url)
    await db.create_all()
    async with db.new_session() as s, s.begin():
        await copy.seed_providers(s)

    runtime.engine = MarketEngine(hub, cfg.engine_secret)
    runtime.engine.add_listener(trading.settle_tick)
    bot: asyncio.Task | None = None
    if cfg.tick_engine_enabled:
        runtime.engine.start()
        if cfg.provider_bot_enabled:
            bot = asyncio.create_task(copy.provider_bot_loop(cfg.provider_bot_interval_seconds), name="provider-bot")
    log.info("started (tick engine %s)", "on" if cfg.tick_engine_enabled else "off")
    try:
        yield
    finally:
        if bot:
            bot.cancel()
            await asyncio.gather(bot, return_exceptions=True)
        await runtime.engine.stop()
        runtime.engine = None
        await db.dispose()


def create_app() -> FastAPI:
    cfg = get_settings()
    app = FastAPI(
        title="Dash Clone API",
        description=(
            "Demo/portfolio backend for a simulated synthetic-index trading platform. All prices come from a "
            "synthetic engine and all balances, deposits and withdrawals are simulated ledger entries — "
            "no real money, payments or market data are involved."
        ),
        version="0.2.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origin_list,
        allow_origin_regex=cfg.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        log.info("%s %s -> %s (%.0fms)", request.method, request.url.path, response.status_code, (time.perf_counter() - start) * 1000)
        return response

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):  # pragma: no cover - safety net
        log.exception("unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    for r in (auth.router, account.router, market.router, trades.router, settings.router, copy_trading.router, ws.router):
        app.include_router(r)

    @app.get("/api/health")
    async def health() -> dict:
        eng = runtime.engine
        return {"status": "ok", "engine": "running" if eng and eng._tasks else "stopped"}

    return app


app = create_app()
