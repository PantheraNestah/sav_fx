"""ORM tables. Money is stored as integer cents; timestamps as epoch milliseconds."""

import time
import uuid

from sqlalchemy import BigInteger, Boolean, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> int:
    return int(time.time() * 1000)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_code: Mapped[str] = mapped_column(String(16), unique=True, default=lambda: uuid.uuid4().hex[:8].upper())
    created_at: Mapped[int] = mapped_column(BigInteger, default=_now)


class Balance(Base):
    __tablename__ = "balances"
    __table_args__ = (UniqueConstraint("user_id", "account_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_type: Mapped[str] = mapped_column(String(8))  # real | demo
    amount_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=_now, onupdate=_now)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    jti: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[int] = mapped_column(BigInteger)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[int] = mapped_column(BigInteger, default=_now)


class Position(Base):
    __tablename__ = "positions"
    __table_args__ = (
        Index("ix_positions_open_symbol", "status", "symbol_id"),
        Index("ix_positions_user_opened", "user_id", "opened_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    symbol_id: Mapped[str] = mapped_column(String(32))
    account_type: Mapped[str] = mapped_column(String(8))
    contract_group: Mapped[str] = mapped_column(String(24))  # matches_differs | over_under | even_odd
    side: Mapped[str] = mapped_column(String(12))
    target_digit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    barrier: Mapped[int | None] = mapped_column(Integer, nullable=True)
    label: Mapped[str] = mapped_column(String(120))
    stake_cents: Mapped[int] = mapped_column(BigInteger)
    payout_cents: Mapped[int] = mapped_column(BigInteger)
    payout_pct: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(8), default="open")  # open | won | lost
    duration_ticks: Mapped[int] = mapped_column(Integer, default=1)
    entry_seq: Mapped[int] = mapped_column(BigInteger)
    entry_spot: Mapped[float] = mapped_column(Float)
    exit_spot: Mapped[float | None] = mapped_column(Float, nullable=True)
    exit_digit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    profit_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    source: Mapped[str] = mapped_column(String(40), default="manual")  # manual | auto | copy:<provider id>
    auto_session_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    opened_at: Mapped[int] = mapped_column(BigInteger, default=_now)
    closed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class LedgerEntry(Base):
    """Append-only audit trail. amount_cents is signed from the user's point of view."""

    __tablename__ = "ledger_entries"
    __table_args__ = (Index("ix_ledger_user_created", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    position_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    type: Mapped[str] = mapped_column(String(16))  # deposit | withdrawal | stake | payout | fee
    amount_cents: Mapped[int] = mapped_column(BigInteger)
    balance_after_cents: Mapped[int] = mapped_column(BigInteger)
    account_type: Mapped[str] = mapped_column(String(8))
    description: Mapped[str] = mapped_column(String(255), default="")
    method: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(12), default="completed")
    created_at: Mapped[int] = mapped_column(BigInteger, default=_now)


class AutoSession(Base):
    __tablename__ = "auto_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_type: Mapped[str] = mapped_column(String(8))
    symbol_id: Mapped[str] = mapped_column(String(32))
    contract_group: Mapped[str] = mapped_column(String(24))
    side: Mapped[str] = mapped_column(String(12))
    target_digit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    barrier: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_ticks: Mapped[int] = mapped_column(Integer, default=1)
    base_stake_cents: Mapped[int] = mapped_column(BigInteger)
    current_stake_cents: Mapped[int] = mapped_column(BigInteger)
    loss_multiple: Mapped[float] = mapped_column(Float)
    target_profit_cents: Mapped[int] = mapped_column(BigInteger)
    target_loss_cents: Mapped[int] = mapped_column(BigInteger)
    max_steps: Mapped[int] = mapped_column(Integer, default=8)
    step: Mapped[int] = mapped_column(Integer, default=1)
    consecutive_losses: Mapped[int] = mapped_column(Integer, default=0)
    session_pl_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(10), default="running")  # running | stopped
    stop_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    started_at: Mapped[int] = mapped_column(BigInteger, default=_now)
    ended_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_created", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(16), default="system")  # win | loss | deposit | withdrawal | system
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[int] = mapped_column(BigInteger, default=_now)


class StrategyProvider(Base):
    __tablename__ = "strategy_providers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, unique=True)
    name: Mapped[str] = mapped_column(String(120))
    initials: Mapped[str] = mapped_column(String(4))
    risk: Mapped[str] = mapped_column(String(24), default="Moderate")
    status: Mapped[str] = mapped_column(String(12), default="active")  # pending | active | suspended
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)  # house-run demo provider
    # Illustrative figures for house providers; real providers are recomputed from positions.
    return_30d: Mapped[float] = mapped_column(Float, default=0.0)
    win_rate: Mapped[float] = mapped_column(Float, default=0.0)
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    min_allocation_cents: Mapped[int] = mapped_column(BigInteger, default=10_000)
    activated_at: Mapped[int] = mapped_column(BigInteger, default=_now)


class CopySubscription(Base):
    __tablename__ = "copy_subscriptions"
    __table_args__ = (UniqueConstraint("follower_id", "provider_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    follower_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("strategy_providers.id", ondelete="CASCADE"), index=True)
    stake_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    started_at: Mapped[int] = mapped_column(BigInteger, default=_now)
