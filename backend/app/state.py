"""
In-memory demo store.

This backend is a portfolio/learning scaffold: balances, trades, and payouts
are entirely simulated in memory (reset on restart). There is no real user
account, no payment processing, and no connection to any real market or
brokerage. Do not wire this up to real money without a full rebuild
(persistent storage, auth, KYC, real pricing/risk engine, licensed
brokerage integration, etc).
"""

import random
import time
import uuid
from asyncio import sleep
from dataclasses import dataclass, field

from .schemas import Balances, BalanceType, Position

TRADE_RESOLUTION_SECONDS = 4.0


@dataclass
class Store:
    balances: Balances = field(default_factory=lambda: Balances(real=0.0, demo=10000.0))
    positions: dict[str, Position] = field(default_factory=dict)

    def reset_demo(self) -> Balances:
        self.balances.demo = 10000.0
        return self.balances

    def list_positions(self) -> list[Position]:
        return sorted(self.positions.values(), key=lambda p: p.opened_at, reverse=True)

    async def place_trade(
        self,
        balance_type: BalanceType,
        symbol: str,
        contract: str,
        stake: float,
        payout_pct: float,
    ) -> Position:
        current = getattr(self.balances, balance_type)
        if stake <= 0 or stake > current:
            raise ValueError("Invalid stake for current balance")

        setattr(self.balances, balance_type, current - stake)

        position = Position(
            id=str(uuid.uuid4()),
            symbol=symbol,
            contract=contract,
            stake=stake,
            payout=round(stake * (1 + payout_pct / 100), 2),
            status="open",
            opened_at=int(time.time() * 1000),
        )
        self.positions[position.id] = position
        return position

    async def resolve_trade(self, balance_type: BalanceType, position_id: str) -> None:
        await sleep(TRADE_RESOLUTION_SECONDS)
        position = self.positions.get(position_id)
        if position is None:
            return

        payout_pct = (position.payout / position.stake - 1) * 100 if position.stake else 0
        won = random.random() * 100 < payout_pct / 2 + 45

        position.status = "won" if won else "lost"
        position.closed_at = int(time.time() * 1000)
        position.profit = round(position.payout - position.stake, 2) if won else round(-position.stake, 2)

        if won:
            current = getattr(self.balances, balance_type)
            setattr(self.balances, balance_type, round(current + position.payout, 2))


store = Store()
