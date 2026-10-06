"""Process-wide singletons wired up in main.lifespan (and by tests)."""

from .market.engine import MarketEngine

engine: MarketEngine | None = None


def get_engine() -> MarketEngine:
    if engine is None:
        raise RuntimeError("market engine not started")
    return engine
