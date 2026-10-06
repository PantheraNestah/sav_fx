"""Copy-trading: provider listing, eligibility and the house provider bot."""

import logging
import random

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import db
from ..events import hub
from ..models import CopySubscription, Position, StrategyProvider
from ..symbols import SYMBOL_SPECS
from . import trading
from .contracts import Contract, build_contract, to_cents
from .notify import Outbox

log = logging.getLogger("dash.copy")

REQUIRED_TRADES = 20
REQUIRED_WIN_RATE = 55.0

# Illustrative house providers (mirrors the demo data in the frontend). Their figures
# are seed values, flagged `isSimulated`; the trades they mirror settle on the real engine.
SEED_PROVIDERS = [
    ("Jordan Blake", "JB", "Low risk", 3953.79, 88.4, 142, 10_000),
    ("Sarah Wang", "SW", "Moderate", 5820.40, 79.2, 289, 15_000),
    ("Elena Morales", "EM", "Conservative", 2110.15, 92.1, 95, 10_000),
]


async def seed_providers(s: AsyncSession) -> None:
    existing = (await s.execute(select(func.count()).select_from(StrategyProvider).where(StrategyProvider.is_simulated.is_(True)))).scalar_one()
    if existing:
        return
    for name, initials, risk, ret, wr, trades, min_alloc in SEED_PROVIDERS:
        s.add(
            StrategyProvider(
                name=name, initials=initials, risk=risk, is_simulated=True, return_30d=ret, win_rate=wr, total_trades=trades, min_allocation_cents=min_alloc
            )
        )


async def follower_count(s: AsyncSession, provider_id: str) -> int:
    return (
        await s.execute(
            select(func.count()).select_from(CopySubscription).where(CopySubscription.provider_id == provider_id, CopySubscription.active.is_(True))
        )
    ).scalar_one()


async def user_performance(s: AsyncSession, user_id: str) -> tuple[int, int, int]:
    """(completed trades, wins, total P/L cents) over the user's own (non-copied) settled positions."""
    rows = (
        await s.execute(
            select(Position.status, Position.profit_cents).where(
                Position.user_id == user_id, Position.status != "open", Position.source.in_(["manual", "auto"])
            )
        )
    ).all()
    wins = sum(1 for st, _ in rows if st == "won")
    return len(rows), wins, sum(p or 0 for _, p in rows)


async def provider_trade(provider_id: str, rng: random.Random | None = None) -> int:
    """One house-provider trade, mirrored into every active follower's real account."""
    rng = rng or random.Random()
    spec = rng.choice(SYMBOL_SPECS)
    group = rng.choice(["even_odd", "matches_differs", "over_under"])
    contract: Contract
    if group == "even_odd":
        contract = build_contract(group, rng.choice(["Even", "Odd"]))
    elif group == "matches_differs":
        contract = build_contract(group, "Differs", target_digit=rng.randint(0, 9))
    else:
        contract = build_contract(group, "Over", barrier=rng.randint(0, 5))

    out = Outbox()
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            prov = await s.get(StrategyProvider, provider_id)
            if prov is None or prov.status != "active":
                return 0
            n = await trading.mirror_trade(s, out, prov, symbol_id=spec.id, contract=contract, stake_cents=to_cents(10), duration=1)
    out.flush(hub)
    return n


async def provider_bot_loop(interval: float) -> None:
    import asyncio

    while True:
        await asyncio.sleep(interval)
        try:
            async with db.new_session() as s:
                ids = (await s.execute(select(StrategyProvider.id).where(StrategyProvider.is_simulated.is_(True), StrategyProvider.status == "active"))).scalars().all()
                busy = [i for i in ids if await follower_count(s, i)]
            for pid in busy:
                await provider_trade(pid)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("provider bot iteration failed")
