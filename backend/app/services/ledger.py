"""Balance mutation. Every change goes through `apply`, which also appends the ledger row."""

import time

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Balance, LedgerEntry


class InsufficientFunds(Exception):
    def __init__(self, available_cents: int, required_cents: int):
        super().__init__("Insufficient balance")
        self.available_cents = available_cents
        self.required_cents = required_cents


async def ensure_balances(s: AsyncSession, user_id: str, demo_cents: int) -> None:
    s.add(Balance(user_id=user_id, account_type="real", amount_cents=0))
    s.add(Balance(user_id=user_id, account_type="demo", amount_cents=demo_cents))
    s.add(
        LedgerEntry(
            user_id=user_id,
            type="deposit",
            amount_cents=demo_cents,
            balance_after_cents=demo_cents,
            account_type="demo",
            description="Initial practice demo grant",
            method="System Bootstrap",
        )
    )


async def get_balance_cents(s: AsyncSession, user_id: str, account_type: str) -> int:
    res = await s.execute(select(Balance.amount_cents).where(Balance.user_id == user_id, Balance.account_type == account_type))
    return int(res.scalar_one())


async def get_balances(s: AsyncSession, user_id: str) -> dict[str, int]:
    res = await s.execute(select(Balance.account_type, Balance.amount_cents).where(Balance.user_id == user_id))
    return {t: int(a) for t, a in res.all()}


async def apply(
    s: AsyncSession,
    user_id: str,
    account_type: str,
    delta_cents: int,
    entry_type: str,
    description: str,
    position_id: str | None = None,
    method: str | None = None,
) -> LedgerEntry:
    """Atomically add `delta_cents` (negative = debit); a debit can never take a balance below zero."""
    cond = [Balance.user_id == user_id, Balance.account_type == account_type]
    if delta_cents < 0:
        cond.append(Balance.amount_cents + delta_cents >= 0)
    res = await s.execute(
        update(Balance).where(*cond).values(amount_cents=Balance.amount_cents + delta_cents, updated_at=int(time.time() * 1000))
    )
    if res.rowcount != 1:
        available = await get_balance_cents(s, user_id, account_type)
        raise InsufficientFunds(available, -delta_cents)
    after = await get_balance_cents(s, user_id, account_type)
    entry = LedgerEntry(
        user_id=user_id,
        position_id=position_id,
        type=entry_type,
        amount_cents=delta_cents,
        balance_after_cents=after,
        account_type=account_type,
        description=description,
        method=method,
    )
    s.add(entry)
    await s.flush()
    return entry
