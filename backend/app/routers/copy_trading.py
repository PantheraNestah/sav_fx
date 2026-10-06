from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import db
from ..db import get_session
from ..deps import get_current_user, get_optional_user
from ..events import hub
from ..models import CopySubscription, StrategyProvider, User
from ..schemas import Eligibility, ProviderOut, SubscribeRequest
from ..services import copy, ledger, notify
from ..services.notify import Outbox

router = APIRouter(prefix="/api/copy-trading", tags=["copy-trading"])


async def _provider_out(s: AsyncSession, p: StrategyProvider, sub: CopySubscription | None) -> ProviderOut:
    trades, win_rate, ret = p.total_trades, p.win_rate, p.return_30d
    if not p.is_simulated and p.user_id:
        n, wins, pl = await copy.user_performance(s, p.user_id)
        trades, win_rate, ret = n, (round(wins / n * 100, 1) if n else 0.0), pl / 100
    return ProviderOut(
        id=p.id,
        initials=p.initials,
        name=p.name,
        risk=p.risk,
        return30d=ret,
        win_rate=win_rate,
        trades=trades,
        followers=await copy.follower_count(s, p.id),
        min_allocation=p.min_allocation_cents / 100,
        is_simulated=p.is_simulated,
        is_following=bool(sub and sub.active),
        stake_multiplier=sub.stake_multiplier if sub and sub.active else None,
    )


@router.get("/providers", response_model=list[ProviderOut])
async def providers(user: User | None = Depends(get_optional_user), session: AsyncSession = Depends(get_session)) -> list[ProviderOut]:
    rows = (await session.execute(select(StrategyProvider).where(StrategyProvider.status == "active").order_by(StrategyProvider.name))).scalars().all()
    subs: dict[str, CopySubscription] = {}
    if user:
        subs = {x.provider_id: x for x in (await session.execute(select(CopySubscription).where(CopySubscription.follower_id == user.id))).scalars().all()}
    return [await _provider_out(session, p, subs.get(p.id)) for p in rows]


@router.post("/providers/{provider_id}/subscribe", response_model=ProviderOut)
async def subscribe(provider_id: str, body: SubscribeRequest, user: User = Depends(get_current_user)) -> ProviderOut:
    """Free in this simulation (no activation fee). Needs the provider's minimum in the real balance."""
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            p = await s.get(StrategyProvider, provider_id)
            if p is None or p.status != "active":
                raise HTTPException(status_code=404, detail="Provider not found")
            if p.user_id == user.id:
                raise HTTPException(status_code=400, detail="You cannot copy your own strategy")
            real = await ledger.get_balance_cents(s, user.id, "real")
            if real < p.min_allocation_cents:
                raise HTTPException(
                    status_code=400, detail=f"Minimum real balance to copy {p.name} is ${p.min_allocation_cents / 100:.2f}"
                )
            sub = (
                await s.execute(select(CopySubscription).where(CopySubscription.follower_id == user.id, CopySubscription.provider_id == p.id))
            ).scalar_one_or_none()
            if sub is None:
                sub = CopySubscription(follower_id=user.id, provider_id=p.id, stake_multiplier=body.stake_multiplier)
                s.add(sub)
            else:
                sub.active, sub.stake_multiplier = True, body.stake_multiplier
            out = Outbox()
            await notify.add(s, out, user.id, f"Subscribed to {p.name}", f"Trades will be mirrored at {body.stake_multiplier}x stake multiplier.", "system")
            await s.flush()
            result = await _provider_out(s, p, sub)
    out.flush(hub)
    return result


@router.post("/providers/{provider_id}/unsubscribe", response_model=ProviderOut)
async def unsubscribe(provider_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ProviderOut:
    p = await session.get(StrategyProvider, provider_id)
    sub = (
        await session.execute(select(CopySubscription).where(CopySubscription.follower_id == user.id, CopySubscription.provider_id == provider_id))
    ).scalar_one_or_none()
    if p is None or sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.active = False
    await session.commit()
    return await _provider_out(session, p, sub)


async def _eligibility(s: AsyncSession, user: User) -> Eligibility:
    n, wins, pl = await copy.user_performance(s, user.id)
    wr = round(wins / n * 100, 1) if n else 0.0
    is_provider = (await s.execute(select(StrategyProvider.id).where(StrategyProvider.user_id == user.id))).first() is not None
    m_t, m_p, m_w = n >= copy.REQUIRED_TRADES, pl > 0, wr >= copy.REQUIRED_WIN_RATE
    return Eligibility(
        completed_trades=n,
        required_trades=copy.REQUIRED_TRADES,
        total_pl=pl / 100,
        win_rate=wr,
        required_win_rate=copy.REQUIRED_WIN_RATE,
        meets_trades=m_t,
        meets_profit=m_p,
        meets_win_rate=m_w,
        eligible=m_t and m_p and m_w,
        is_provider=is_provider,
    )


@router.get("/eligibility", response_model=Eligibility)
async def eligibility(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> Eligibility:
    return await _eligibility(session, user)


@router.post("/become-provider", response_model=ProviderOut, status_code=201)
async def become_provider(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ProviderOut:
    el = await _eligibility(session, user)
    if el.is_provider:
        raise HTTPException(status_code=409, detail="You are already a strategy provider")
    if not el.eligible:
        raise HTTPException(status_code=403, detail="Eligibility requirements not met")
    initials = "".join(w[0] for w in user.display_name.split()[:2]).upper() or user.display_name[:1].upper()
    p = StrategyProvider(user_id=user.id, name=user.display_name, initials=initials[:4], risk="Moderate", status="active")
    session.add(p)
    await session.commit()
    return await _provider_out(session, p, None)
