"""Synthetic index engine.

Prices are a bounded random walk driven by HMAC-SHA256(epoch_seed, "symbol:seq"),
not by any real market. Seeds rotate every EPOCH_TICKS ticks; the SHA-256
commitment of the current seed is public and the seed itself is revealed once its
epoch is over, so past sequences can be re-derived and audited ("provably fair").
"""

import asyncio
import hashlib
import hmac
import logging
import time
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from ..events import Hub
from ..symbols import SYMBOL_SPECS, SymbolSpec

log = logging.getLogger("dash.engine")

EPOCH_TICKS = 3600
HISTORY_LEN = 300
WARMUP_TICKS = 120
MEAN_REVERSION = 0.0005


@dataclass(frozen=True)
class TickEvent:
    symbol_id: str
    seq: int
    time_ms: int
    price: float

    @property
    def digit(self) -> int:
        return last_digit(self.price)

    def as_dict(self) -> dict:
        return {"symbol": self.symbol_id, "seq": self.seq, "time": self.time_ms, "price": self.price, "digit": self.digit}


def last_digit(price: float) -> int:
    """Last digit of the price quoted to 2 decimals (e.g. 9583.15 -> 5)."""
    return int(round(price * 100)) % 10


def epoch_seed(master_secret: str, epoch: int) -> bytes:
    return hmac.new(master_secret.encode(), f"epoch:{epoch}".encode(), hashlib.sha256).digest()


def commitment(seed: bytes) -> str:
    return hashlib.sha256(seed).hexdigest()


def step_uniform(seed: bytes, symbol_id: str, seq: int) -> float:
    """Deterministic uniform in [0, 1) for a given epoch seed, symbol and tick sequence."""
    digest = hmac.new(seed, f"{symbol_id}:{seq}".encode(), hashlib.sha256).digest()
    return int.from_bytes(digest[:8], "big") / 2**64


TickListener = Callable[[TickEvent], Awaitable[None]]


class SymbolState:
    def __init__(self, spec: SymbolSpec, start_seq: int):
        self.spec = spec
        self.price = spec.base_price
        self.seq = start_seq
        self.history: deque[TickEvent] = deque(maxlen=HISTORY_LEN)


class MarketEngine:
    def __init__(self, hub: Hub, secret: str, specs: list[SymbolSpec] | None = None, clock: Callable[[], float] = time.time):
        self.hub = hub
        self._secret = secret
        self._clock = clock
        self.specs = specs or SYMBOL_SPECS
        self._listeners: list[TickListener] = []
        self._tasks: list[asyncio.Task] = []
        start_seq = int(clock())
        self.states: dict[str, SymbolState] = {s.id: SymbolState(s, start_seq - WARMUP_TICKS) for s in self.specs}
        for state in self.states.values():
            for i in range(WARMUP_TICKS):
                # Backdated warm-up history so charts have data immediately. Listeners
                # are not notified for these, so they never settle anything.
                self._generate(state, time_ms=int((clock() - (WARMUP_TICKS - i) * state.spec.interval_seconds) * 1000), publish=False)

    # -- generation ---------------------------------------------------------

    def _generate(self, state: SymbolState, time_ms: int | None = None, publish: bool = True) -> TickEvent:
        state.seq += 1
        seed = epoch_seed(self._secret, state.seq // EPOCH_TICKS)
        u = step_uniform(seed, state.spec.id, state.seq)
        spec = state.spec
        price = state.price + (u - 0.5) * state.price * spec.volatility
        price += (spec.base_price - price) * MEAN_REVERSION
        state.price = max(1.0, round(price, 2))
        tick = TickEvent(spec.id, state.seq, time_ms if time_ms is not None else int(self._clock() * 1000), state.price)
        state.history.append(tick)
        if publish:
            self.hub.publish(f"ticks:{spec.id}", tick.as_dict())
        return tick

    def advance(self, symbol_id: str) -> TickEvent:
        """Generate and publish the next tick (listeners are notified by `tick`)."""
        return self._generate(self.states[symbol_id])

    async def tick(self, symbol_id: str) -> TickEvent:
        t = self.advance(symbol_id)
        for listener in self._listeners:
            try:
                await listener(t)
            except Exception:  # a failing settlement must never kill the price feed
                log.exception("tick listener failed for %s seq=%s", symbol_id, t.seq)
        return t

    # -- reads --------------------------------------------------------------

    def latest(self, symbol_id: str) -> TickEvent:
        return self.states[symbol_id].history[-1]

    def history(self, symbol_id: str, limit: int = 60) -> list[TickEvent]:
        return list(self.states[symbol_id].history)[-limit:]

    def digit_stats(self, symbol_id: str, window: int = 40) -> list[dict]:
        digits = [t.digit for t in self.history(symbol_id, window)]
        n = len(digits) or 1
        return [{"digit": d, "pct": round(digits.count(d) / n * 100, 1)} for d in range(10)]

    def fairness(self) -> dict:
        current_seq = max(s.seq for s in self.states.values())
        current = current_seq // EPOCH_TICKS
        revealed = [
            {"epoch": e, "seed": epoch_seed(self._secret, e).hex(), "commitment": commitment(epoch_seed(self._secret, e))}
            for e in range(max(0, current - 5), current)
        ]
        return {
            "algorithm": "price' = price + (u - 0.5) * price * volatility, u = HMAC_SHA256(seed, '<symbol>:<seq>')[0:8] / 2^64",
            "epochTicks": EPOCH_TICKS,
            "currentEpoch": current,
            "currentCommitment": commitment(epoch_seed(self._secret, current)),
            "revealed": revealed,
        }

    # -- lifecycle ----------------------------------------------------------

    def add_listener(self, listener: TickListener) -> None:
        self._listeners.append(listener)

    async def _run_symbol(self, spec: SymbolSpec) -> None:
        # Self-correcting schedule so slow listeners don't accumulate drift.
        next_at = time.monotonic() + spec.interval_seconds
        while True:
            await asyncio.sleep(max(0.0, next_at - time.monotonic()))
            next_at += spec.interval_seconds
            await self.tick(spec.id)

    def start(self) -> None:
        self._tasks = [asyncio.create_task(self._run_symbol(s), name=f"ticks:{s.id}") for s in self.specs]

    async def stop(self) -> None:
        for t in self._tasks:
            t.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks = []
