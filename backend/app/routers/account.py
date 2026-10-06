import time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import db, runtime
from ..config import get_settings
from ..db import get_session
from ..deps import get_current_user
from ..events import hub
from ..models import LedgerEntry, Notification, Position, User
from ..schemas import (
    Balances,
    MoneyRequest,
    MoneyResponse,
    NotificationOut,
    ResetDemoResponse,
    TransactionOut,
    TransactionPage,
)
from ..services import ledger, notify
from ..services.contracts import to_cents
from ..services.notify import Outbox

router = APIRouter(prefix="/api/account", tags=["account"])


def balances_out(b: dict[str, int]) -> Balances:
    return Balances(real=b.get("real", 0) / 100, demo=b.get("demo", 0) / 100)


@router.get("/balance", response_model=Balances)
async def get_balance(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> Balances:
    return balances_out(await ledger.get_balances(session, user.id))


@router.post("/reset-demo", response_model=ResetDemoResponse)
async def reset_demo(user: User = Depends(get_current_user)) -> ResetDemoResponse:
    target = to_cents(get_settings().demo_start_balance)
    out = Outbox()
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            current = await ledger.get_balance_cents(s, user.id, "demo")
            delta = target - current
            if delta != 0:
                await ledger.apply(s, user.id, "demo", delta, "deposit", "Reset demo practice balance", method="Demo Reset")
            b = await ledger.get_balances(s, user.id)
            out.user(user.id, "balance", {"real": b["real"] / 100, "demo": b["demo"] / 100})
    out.flush(hub)
    return ResetDemoResponse(balances=balances_out(b))


@router.post("/deposit", response_model=MoneyResponse)
async def deposit(body: MoneyRequest, user: User = Depends(get_current_user)) -> MoneyResponse:
    """SIMULATED funding: credits the real-balance ledger without touching any payment provider."""
    cfg = get_settings()
    if body.amount > cfg.max_simulated_deposit:
        raise HTTPException(status_code=422, detail=f"Maximum simulated deposit is ${cfg.max_simulated_deposit:,.2f}")
    cents = to_cents(body.amount)
    out = Outbox()
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            entry = await ledger.apply(s, user.id, "real", cents, "deposit", f"Deposit via {body.method}", method=body.method)
            await notify.add(s, out, user.id, f"Deposit Credited: +${body.amount:.2f}", f"Processed via {body.method} (simulated funds).", "deposit")
            b = await ledger.get_balances(s, user.id)
            out.user(user.id, "balance", {"real": b["real"] / 100, "demo": b["demo"] / 100})
            tx = TransactionOut.from_row(entry)
    out.flush(hub)
    return MoneyResponse(balances=balances_out(b), transaction=tx)


@router.post("/withdraw", response_model=MoneyResponse)
async def withdraw(body: MoneyRequest, user: User = Depends(get_current_user)) -> MoneyResponse:
    """SIMULATED payout: debits the real-balance ledger; no money leaves any account."""
    cfg = get_settings()
    if body.amount < cfg.min_withdrawal:
        raise HTTPException(status_code=422, detail=f"Minimum withdrawal is ${cfg.min_withdrawal:.2f}")
    if not body.destination:
        raise HTTPException(status_code=422, detail="destination is required")
    cents = to_cents(body.amount)
    out = Outbox()
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            try:
                entry = await ledger.apply(
                    s, user.id, "real", -cents, "withdrawal", f"Withdrawal to {body.method} ({body.destination})", method=body.method
                )
            except ledger.InsufficientFunds as exc:
                raise HTTPException(
                    status_code=400, detail=f"Insufficient real balance (${exc.available_cents / 100:.2f})"
                ) from exc
            await notify.add(s, out, user.id, f"Withdrawal Submitted: -${body.amount:.2f}", f"Sent to {body.method} (simulated).", "withdrawal")
            b = await ledger.get_balances(s, user.id)
            out.user(user.id, "balance", {"real": b["real"] / 100, "demo": b["demo"] / 100})
            tx = TransactionOut.from_row(entry)
    out.flush(hub)
    return MoneyResponse(balances=balances_out(b), transaction=tx)


@router.get("/transactions", response_model=TransactionPage)
async def transactions(
    type: str | None = Query(default=None, description="deposit | withdrawal | stake | payout | fee"),
    balance_type: str | None = Query(default=None, alias="balanceType", pattern="^(real|demo)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TransactionPage:
    q = select(LedgerEntry).where(LedgerEntry.user_id == user.id)
    if type:
        q = q.where(LedgerEntry.type == type)
    if balance_type:
        q = q.where(LedgerEntry.account_type == balance_type)
    total = (await session.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (await session.execute(q.order_by(LedgerEntry.created_at.desc(), LedgerEntry.id).limit(limit).offset(offset))).scalars().all()
    return TransactionPage(items=[TransactionOut.from_row(r) for r in rows], total=total, limit=limit, offset=offset)


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[NotificationOut]:
    rows = (
        await session.execute(
            select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [NotificationOut.from_row(n) for n in rows]


@router.post("/notifications/read-all", status_code=204)
async def read_all(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> None:
    from sqlalchemy import update

    await session.execute(update(Notification).where(Notification.user_id == user.id).values(read=True))
    await session.commit()


@router.post("/notifications/{notification_id}/read", status_code=204)
async def read_one(notification_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> None:
    n = await session.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    await session.commit()
