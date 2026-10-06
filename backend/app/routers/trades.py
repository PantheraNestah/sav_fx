import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import runtime
from ..db import get_session
from ..deps import get_current_user
from ..models import AutoSession, LedgerEntry, Position, User
from ..schemas import (
    AutoSessionOut,
    PlaceTradeRequest,
    PositionOut,
    PositionPage,
    Quote,
    SessionStats,
    StartAutoRequest,
    TransactionOut,
    TransactionPage,
)
from ..services import trading
from ..services.contracts import to_cents

router = APIRouter(tags=["trades"])


def _http(exc: trading.TradeError) -> HTTPException:
    return HTTPException(status_code=exc.status, detail={"code": exc.code, "message": exc.message})


@router.get("/api/trades/quote", response_model=Quote)
async def quote(
    side: str,
    contract_group: str = Query(alias="contractGroup"),
    target_digit: int | None = Query(default=None, alias="targetDigit", ge=0, le=9),
    barrier: int | None = Query(default=None, ge=0, le=9),
    stake: float = Query(default=10.0, gt=0),
) -> Quote:
    """Server-side payout preview (public; the client must not price its own contracts)."""
    try:
        c = trading.make_contract(contract_group, side, target_digit, barrier)
    except trading.TradeError as exc:
        raise _http(exc) from exc
    return Quote(contract=c.label, payout_pct=c.payout_pct, stake=stake, payout=round(stake * (1 + c.payout_pct / 100), 2), win_probability=c.win_probability)


@router.post("/api/trades", response_model=PositionOut, status_code=201)
async def place_trade(body: PlaceTradeRequest, user: User = Depends(get_current_user)) -> PositionOut:
    try:
        pos = await trading.place_trade(
            user.id,
            account_type=body.balance_type,
            symbol_id=body.symbol,
            group=body.contract_group,
            side=body.side,
            target_digit=body.target_digit,
            barrier=body.barrier,
            duration_ticks=body.duration_ticks,
            stake=body.stake,
            desired_payout=body.desired_payout,
        )
    except trading.TradeError as exc:
        raise _http(exc) from exc
    return PositionOut.from_row(pos)


@router.get("/api/trades", response_model=PositionPage)
async def list_trades(
    status: str | None = Query(default=None, pattern="^(open|closed|won|lost)$"),
    balance_type: str | None = Query(default=None, alias="balanceType", pattern="^(real|demo)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PositionPage:
    q = select(Position).where(Position.user_id == user.id)
    if status == "closed":
        q = q.where(Position.status != "open")
    elif status:
        q = q.where(Position.status == status)
    if balance_type:
        q = q.where(Position.account_type == balance_type)
    total = (await session.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (await session.execute(q.order_by(Position.opened_at.desc(), Position.id).limit(limit).offset(offset))).scalars().all()
    return PositionPage(items=[PositionOut.from_row(r) for r in rows], total=total, limit=limit, offset=offset)


# Plan-style aliases (docs/BACKEND_PLAN.md §9).
router.add_api_route("/api/positions", list_trades, methods=["GET"], response_model=PositionPage, tags=["trades"])


@router.get("/api/positions/stats", response_model=SessionStats)
async def stats(
    since: int | None = Query(default=None, description="epoch ms; defaults to start of the current UTC day"),
    balance_type: str | None = Query(default=None, alias="balanceType", pattern="^(real|demo)$"),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SessionStats:
    """Session = everything settled since `since`. Default: UTC midnight (documented choice)."""
    if since is None:
        since = int(datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
    q = select(Position).where(Position.user_id == user.id, Position.status != "open", Position.closed_at >= since)
    if balance_type:
        q = q.where(Position.account_type == balance_type)
    rows = (await session.execute(q)).scalars().all()
    wins = sum(1 for r in rows if r.status == "won")
    pl = sum(r.profit_cents or 0 for r in rows)
    return SessionStats(
        total_trades=len(rows),
        wins=wins,
        losses=len(rows) - wins,
        win_rate=round(wins / len(rows) * 100, 1) if rows else 0.0,
        session_pl=pl / 100,
        since=since,
    )


@router.get("/api/positions/transactions", response_model=TransactionPage)
async def position_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TransactionPage:
    q = select(LedgerEntry).where(LedgerEntry.user_id == user.id, LedgerEntry.type.in_(["stake", "payout"]))
    total = (await session.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (await session.execute(q.order_by(LedgerEntry.created_at.desc(), LedgerEntry.id).limit(limit).offset(offset))).scalars().all()
    return TransactionPage(items=[TransactionOut.from_row(r) for r in rows], total=total, limit=limit, offset=offset)


@router.get("/api/positions/{position_id}", response_model=PositionOut)
async def get_position(position_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> PositionOut:
    pos = await session.get(Position, position_id)
    if pos is None or pos.user_id != user.id:
        raise HTTPException(status_code=404, detail="Position not found")
    return PositionOut.from_row(pos)


# ---- auto trading ---------------------------------------------------------


@router.post("/api/trades/auto", response_model=AutoSessionOut, status_code=201)
async def start_auto(body: StartAutoRequest, user: User = Depends(get_current_user)) -> AutoSessionOut:
    try:
        sess = await trading.start_auto(
            user.id,
            account_type=body.balance_type,
            symbol_id=body.symbol,
            group=body.contract_group,
            side=body.side,
            target_digit=body.target_digit,
            barrier=body.barrier,
            duration_ticks=body.duration_ticks,
            base_stake=body.base_stake,
            loss_multiple=body.loss_multiple,
            target_profit=body.target_profit,
            target_loss=body.target_loss,
        )
    except trading.TradeError as exc:
        raise _http(exc) from exc
    return AutoSessionOut.from_row(sess)


@router.get("/api/trades/auto", response_model=AutoSessionOut | None)
async def current_auto(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> AutoSessionOut | None:
    """The running session if there is one, otherwise the most recent finished one (or null)."""
    row = (
        await session.execute(
            select(AutoSession)
            .where(AutoSession.user_id == user.id)
            .order_by((AutoSession.status == "running").desc(), AutoSession.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return AutoSessionOut.from_row(row) if row else None


@router.post("/api/trades/auto/{session_id}/stop", response_model=AutoSessionOut)
async def stop_auto(session_id: str, user: User = Depends(get_current_user)) -> AutoSessionOut:
    try:
        sess = await trading.stop_auto(user.id, session_id)
    except trading.TradeError as exc:
        raise _http(exc) from exc
    return AutoSessionOut.from_row(sess)
