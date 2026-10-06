"""Opening, settling and auto-running contracts.

A contract opens at the latest tick (`entry_seq`) and settles on the tick whose
`seq >= entry_seq + duration_ticks`, using that tick's last digit. Payouts come from
services.contracts, never from the client.
"""

import time
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import db, runtime
from ..config import get_settings
from ..events import hub
from ..market.engine import TickEvent
from ..models import AutoSession, CopySubscription, Position, StrategyProvider
from ..ratelimit import TokenBucket
from ..schemas import AutoSessionOut, PositionOut
from ..symbols import SYMBOLS_BY_ID
from . import ledger, notify
from .contracts import Contract, ContractError, build_contract, payout_cents, to_cents
from .notify import Outbox

MAX_AUTO_STEPS = 8


class TradeError(Exception):
    def __init__(self, message: str, status: int = 400, code: str = "trade_error"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


_limiter: TokenBucket | None = None


def limiter() -> TokenBucket:
    global _limiter
    if _limiter is None:
        _limiter = TokenBucket(get_settings().trade_rate_per_minute)
    return _limiter


def reset_limiter() -> None:
    global _limiter
    _limiter = None


def _validate_stake(stake_cents: int) -> None:
    cfg = get_settings()
    if stake_cents < to_cents(cfg.min_stake):
        raise TradeError(f"Minimum stake is ${cfg.min_stake:.2f}", 422, "stake_too_low")
    if stake_cents > to_cents(cfg.max_stake):
        raise TradeError(f"Maximum stake is ${cfg.max_stake:.2f}", 422, "stake_too_high")


def make_contract(group: str, side: str, target_digit: int | None, barrier: int | None) -> Contract:
    try:
        return build_contract(group, side, target_digit, barrier)
    except ContractError as exc:
        raise TradeError(str(exc), 422, "invalid_contract") from exc


def stake_for_desired_payout(contract: Contract, desired_payout: float) -> int:
    return int(round(to_cents(desired_payout) / (1 + contract.payout_pct / 100)))


async def open_position(
    s: AsyncSession,
    out: Outbox,
    *,
    user_id: str,
    account_type: str,
    symbol_id: str,
    contract: Contract,
    stake_cents: int,
    duration_ticks: int = 1,
    source: str = "manual",
    auto_session_id: str | None = None,
) -> Position:
    cfg = get_settings()
    if symbol_id not in SYMBOLS_BY_ID:
        raise TradeError(f"Unknown symbol '{symbol_id}'", 404, "unknown_symbol")
    if not 1 <= duration_ticks <= cfg.max_duration_ticks:
        raise TradeError(f"duration_ticks must be between 1 and {cfg.max_duration_ticks}", 422, "invalid_duration")
    _validate_stake(stake_cents)

    tick = runtime.get_engine().latest(symbol_id)
    pct = contract.payout_pct
    pos = Position(
        id=str(uuid.uuid4()),
        user_id=user_id,
        symbol_id=symbol_id,
        account_type=account_type,
        contract_group=contract.group,
        side=contract.side,
        target_digit=contract.target_digit,
        barrier=contract.barrier,
        label=contract.label,
        stake_cents=stake_cents,
        payout_cents=payout_cents(stake_cents, pct),
        payout_pct=pct,
        duration_ticks=duration_ticks,
        entry_seq=tick.seq,
        entry_spot=tick.price,
        source=source,
        auto_session_id=auto_session_id,
        opened_at=int(time.time() * 1000),
    )
    # Debit first: a refused stake must leave no trace (no savepoints needed by callers).
    try:
        await ledger.apply(
            s, user_id, account_type, -stake_cents, "stake", f"Stake on {contract.label} ({symbol_id})", position_id=pos.id
        )
    except ledger.InsufficientFunds as exc:
        raise TradeError(
            f"Insufficient {account_type} balance (${exc.available_cents / 100:.2f}) for stake ${stake_cents / 100:.2f}",
            400,
            "insufficient_funds",
        ) from exc
    s.add(pos)
    await s.flush()
    out.user(user_id, "position.opened", PositionOut.from_row(pos).model_dump(by_alias=True))
    await _emit_balances(s, out, user_id)
    return pos


async def _emit_balances(s: AsyncSession, out: Outbox, user_id: str) -> None:
    b = await ledger.get_balances(s, user_id)
    out.user(user_id, "balance", {"real": b.get("real", 0) / 100, "demo": b.get("demo", 0) / 100})


async def place_trade(
    user_id: str,
    *,
    account_type: str,
    symbol_id: str,
    group: str,
    side: str,
    target_digit: int | None,
    barrier: int | None,
    duration_ticks: int,
    stake: float | None,
    desired_payout: float | None,
) -> Position:
    if (stake is None) == (desired_payout is None):
        raise TradeError("Provide exactly one of stake or desiredPayout", 422, "invalid_request")
    if not limiter().allow(user_id):
        raise TradeError("Too many trades, slow down", 429, "rate_limited")
    contract = make_contract(group, side, target_digit, barrier)
    stake_cents = to_cents(stake) if stake is not None else stake_for_desired_payout(contract, desired_payout or 0)

    out = Outbox()
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            pos = await open_position(
                s,
                out,
                user_id=user_id,
                account_type=account_type,
                symbol_id=symbol_id,
                contract=contract,
                stake_cents=stake_cents,
                duration_ticks=duration_ticks,
            )
            await mirror_to_followers(s, out, user_id, pos)
    out.flush(hub)
    return pos


# ---- copy trading ---------------------------------------------------------


async def mirror_to_followers(s: AsyncSession, out: Outbox, provider_user_id: str, source: Position) -> None:
    prov = (
        await s.execute(select(StrategyProvider).where(StrategyProvider.user_id == provider_user_id, StrategyProvider.status == "active"))
    ).scalar_one_or_none()
    if prov is None or source.source != "manual":
        return
    await mirror_trade(s, out, prov, symbol_id=source.symbol_id, contract=_contract_of(source), stake_cents=source.stake_cents, duration=source.duration_ticks)


def _contract_of(p: Position) -> Contract:
    return build_contract(p.contract_group, p.side, p.target_digit, p.barrier)


async def mirror_trade(
    s: AsyncSession, out: Outbox, provider: StrategyProvider, *, symbol_id: str, contract: Contract, stake_cents: int, duration: int
) -> int:
    """Copy one provider trade into every active follower's REAL account. Returns number mirrored."""
    subs = (
        await s.execute(
            select(CopySubscription).where(CopySubscription.provider_id == provider.id, CopySubscription.active.is_(True))
        )
    ).scalars().all()
    mirrored = 0
    for sub in subs:
        if sub.follower_id == provider.user_id:
            continue
        stake = max(to_cents(get_settings().min_stake), int(round(stake_cents * sub.stake_multiplier)))
        try:
            await open_position(
                s,
                out,
                user_id=sub.follower_id,
                account_type="real",
                symbol_id=symbol_id,
                contract=contract,
                stake_cents=stake,
                duration_ticks=duration,
                source=f"copy:{provider.id}",
            )
            mirrored += 1
        except TradeError as exc:
            await notify.add(
                s, out, sub.follower_id, f"Copy trade skipped ({provider.name})", exc.message, "system"
            )
    return mirrored


# ---- settlement -----------------------------------------------------------


async def settle_tick(tick: TickEvent) -> int:
    """Resolve every open position on `tick.symbol_id` that has run its duration. Returns count settled."""
    out = Outbox()
    settled = 0
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            rows = (
                await s.execute(
                    select(Position)
                    .where(
                        Position.status == "open",
                        Position.symbol_id == tick.symbol_id,
                        Position.entry_seq + Position.duration_ticks <= tick.seq,
                    )
                    .order_by(Position.opened_at)
                )
            ).scalars().all()
            for pos in rows:
                await _settle_position(s, out, pos, tick)
                settled += 1
    if settled:
        out.flush(hub)
    return settled


async def _settle_position(s: AsyncSession, out: Outbox, pos: Position, tick: TickEvent) -> None:
    digit = tick.digit
    won = _contract_of(pos).wins(digit)
    pos.exit_spot = tick.price
    pos.exit_digit = digit
    pos.status = "won" if won else "lost"
    pos.closed_at = int(time.time() * 1000)
    pos.profit_cents = pos.payout_cents - pos.stake_cents if won else -pos.stake_cents
    if won:
        await ledger.apply(s, pos.user_id, pos.account_type, pos.payout_cents, "payout", f"Won payout on {pos.label}", position_id=pos.id)
    out.user(pos.user_id, "position.settled", PositionOut.from_row(pos).model_dump(by_alias=True))
    await _emit_balances(s, out, pos.user_id)

    profit = (pos.profit_cents or 0) / 100
    if won:
        await notify.add(s, out, pos.user_id, f"Won Trade: +${profit:.2f}", f"{pos.label} on {pos.symbol_id} settled favorably.", "win")
    else:
        await notify.add(s, out, pos.user_id, f"Trade Lost: -${pos.stake_cents / 100:.2f}", f"{pos.label} on {pos.symbol_id} did not win.", "loss")

    if pos.auto_session_id:
        sess = await s.get(AutoSession, pos.auto_session_id)
        if sess is not None and sess.status == "running":
            await _advance_auto(s, out, sess, pos, won)


# ---- auto trading ---------------------------------------------------------


def _stop_auto(sess: AutoSession, reason: str) -> None:
    sess.status = "stopped"
    sess.stop_reason = reason
    sess.ended_at = int(time.time() * 1000)


_STOP_MESSAGES = {
    "target_profit": ("Auto Trading Goal Hit", "Target profit reached. Session stopped.", "system"),
    "target_loss": ("Target Loss Limit Hit", "Target loss reached. Auto trading halted.", "system"),
    "max_steps": ("Max Martingale Steps Reached", "Reached the maximum step count. Auto trading stopped to protect balance.", "system"),
    "insufficient_balance": ("Insufficient Balance for Next Step", "Next stake exceeds your balance. Auto trading stopped.", "system"),
    "stake_limit": ("Stake Limit Reached", "Next stake exceeds the maximum allowed stake. Auto trading stopped.", "system"),
}


async def _advance_auto(s: AsyncSession, out: Outbox, sess: AutoSession, pos: Position, won: bool) -> None:
    sess.session_pl_cents += pos.profit_cents or 0
    sess.total_trades += 1
    if won:
        sess.wins += 1
        sess.consecutive_losses = 0
    else:
        sess.losses += 1
        sess.consecutive_losses += 1

    reason: str | None = None
    if sess.session_pl_cents >= sess.target_profit_cents:
        reason = "target_profit"
    elif sess.session_pl_cents <= -sess.target_loss_cents:
        reason = "target_loss"
    elif not won and sess.step >= sess.max_steps:
        reason = "max_steps"
    else:
        next_stake = sess.base_stake_cents if won else int(round(sess.base_stake_cents * sess.loss_multiple**sess.consecutive_losses))
        sess.step = 1 if won else min(sess.max_steps, sess.step + 1)
        sess.current_stake_cents = next_stake
        if next_stake > to_cents(get_settings().max_stake):
            reason = "stake_limit"
        else:
            try:
                await open_position(
                    s,
                    out,
                    user_id=sess.user_id,
                    account_type=sess.account_type,
                    symbol_id=sess.symbol_id,
                    contract=build_contract(sess.contract_group, sess.side, sess.target_digit, sess.barrier),
                    stake_cents=next_stake,
                    duration_ticks=sess.duration_ticks,
                    source="auto",
                    auto_session_id=sess.id,
                )
            except TradeError as exc:
                reason = "insufficient_balance" if exc.code == "insufficient_funds" else "stake_limit"

    if reason:
        _stop_auto(sess, reason)
        title, msg, kind = _STOP_MESSAGES[reason]
        await notify.add(s, out, sess.user_id, title, msg, kind)
    out.user(sess.user_id, "auto.update", AutoSessionOut.from_row(sess).model_dump(by_alias=True))


async def start_auto(
    user_id: str,
    *,
    account_type: str,
    symbol_id: str,
    group: str,
    side: str,
    target_digit: int | None,
    barrier: int | None,
    duration_ticks: int,
    base_stake: float,
    loss_multiple: float,
    target_profit: float,
    target_loss: float,
) -> AutoSession:
    contract = make_contract(group, side, target_digit, barrier)
    base_cents = to_cents(base_stake)
    out = Outbox()
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            running = (
                await s.execute(select(func.count()).select_from(AutoSession).where(AutoSession.user_id == user_id, AutoSession.status == "running"))
            ).scalar_one()
            if running:
                raise TradeError("An auto-trading session is already running", 409, "auto_already_running")
            sess = AutoSession(
                user_id=user_id,
                account_type=account_type,
                symbol_id=symbol_id,
                contract_group=contract.group,
                side=contract.side,
                target_digit=contract.target_digit,
                barrier=contract.barrier,
                duration_ticks=duration_ticks,
                base_stake_cents=base_cents,
                current_stake_cents=base_cents,
                loss_multiple=loss_multiple,
                target_profit_cents=to_cents(target_profit),
                target_loss_cents=to_cents(target_loss),
                max_steps=MAX_AUTO_STEPS,
            )
            s.add(sess)
            await s.flush()
            await open_position(
                s,
                out,
                user_id=user_id,
                account_type=account_type,
                symbol_id=symbol_id,
                contract=contract,
                stake_cents=base_cents,
                duration_ticks=duration_ticks,
                source="auto",
                auto_session_id=sess.id,
            )
            out.user(user_id, "auto.update", AutoSessionOut.from_row(sess).model_dump(by_alias=True))
    out.flush(hub)
    return sess


async def stop_auto(user_id: str, session_id: str) -> AutoSession:
    out = Outbox()
    async with db.write_lock:
        async with db.new_session() as s, s.begin():
            sess = await s.get(AutoSession, session_id)
            if sess is None or sess.user_id != user_id:
                raise TradeError("Auto session not found", 404, "not_found")
            if sess.status == "running":
                _stop_auto(sess, "manual")
                out.user(user_id, "auto.update", AutoSessionOut.from_row(sess).model_dump(by_alias=True))
    out.flush(hub)
    return sess
