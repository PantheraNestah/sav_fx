"""API schemas. JSON is camelCase (matching frontend/src/types.ts); snake_case is also accepted on input."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from .models import AutoSession, LedgerEntry, Notification, Position as PositionRow

BalanceType = Literal["real", "demo"]
ContractGroup = Literal["matches_differs", "over_under", "even_odd"]
PositionStatus = Literal["open", "won", "lost"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---- market ---------------------------------------------------------------


class Symbol(CamelModel):
    id: str
    label: str
    group: str


class Tick(CamelModel):
    time: int
    price: float
    seq: int | None = None
    digit: int | None = None


class DigitStat(CamelModel):
    digit: int
    pct: float


class MarketSnapshot(CamelModel):
    symbol: str
    ticks: list[Tick]
    digit_stats: list[DigitStat]
    last_digit: int
    price: float
    change: float
    change_pct: float


# ---- auth / users ---------------------------------------------------------


class RegisterRequest(CamelModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(CamelModel):
    email: str
    password: str
    otp: str | None = None


class RefreshRequest(CamelModel):
    refresh_token: str | None = None


class ForgotPasswordRequest(CamelModel):
    email: str


class ResetPasswordRequest(CamelModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(CamelModel):
    id: str
    name: str
    email: str
    is_verified: bool
    two_factor_enabled: bool
    referral_code: str


class AuthResponse(CamelModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# ---- account --------------------------------------------------------------


class Balances(CamelModel):
    real: float
    demo: float


class MoneyRequest(CamelModel):
    amount: float = Field(gt=0)
    method: str = Field(min_length=1, max_length=60)
    destination: str | None = Field(default=None, max_length=120)


class TransactionOut(CamelModel):
    id: str
    type: str
    amount: float
    balance_type: BalanceType
    timestamp: int
    description: str
    status: str
    method: str | None = None
    position_id: str | None = None

    @classmethod
    def from_row(cls, e: LedgerEntry) -> "TransactionOut":
        return cls(
            id=e.id,
            type=e.type,
            amount=e.amount_cents / 100,
            balance_type=e.account_type,  # type: ignore[arg-type]
            timestamp=e.created_at,
            description=e.description,
            status=e.status,
            method=e.method,
            position_id=e.position_id,
        )


class MoneyResponse(CamelModel):
    balances: Balances
    transaction: TransactionOut


class ResetDemoResponse(CamelModel):
    balances: Balances


class NotificationOut(CamelModel):
    id: str
    title: str
    message: str
    timestamp: int
    type: str
    read: bool

    @classmethod
    def from_row(cls, n: Notification) -> "NotificationOut":
        return cls(id=n.id, title=n.title, message=n.message, timestamp=n.created_at, type=n.type, read=n.read)


# ---- trading --------------------------------------------------------------


class PlaceTradeRequest(CamelModel):
    balance_type: BalanceType = "demo"
    symbol: str
    contract_group: ContractGroup
    side: str
    target_digit: int | None = Field(default=None, ge=0, le=9)
    barrier: int | None = Field(default=None, ge=0, le=9)
    duration_ticks: int = Field(default=1, ge=1)
    # Provide exactly one of stake / desired_payout ("Set Stake Amount" vs "Set Desired Payout").
    stake: float | None = Field(default=None, gt=0)
    desired_payout: float | None = Field(default=None, gt=0)


class PositionOut(CamelModel):
    id: str
    symbol: str
    contract: str
    contract_group: ContractGroup
    side: str
    target_digit: int | None = None
    barrier: int | None = None
    stake: float
    payout: float
    payout_pct: float
    status: PositionStatus
    opened_at: int
    closed_at: int | None = None
    profit: float | None = None
    entry_spot: float
    exit_spot: float | None = None
    exit_digit: int | None = None
    balance_type: BalanceType
    duration_ticks: int
    source: str
    auto_session_id: str | None = None

    @classmethod
    def from_row(cls, p: PositionRow) -> "PositionOut":
        return cls(
            id=p.id,
            symbol=p.symbol_id,
            contract=p.label,
            contract_group=p.contract_group,  # type: ignore[arg-type]
            side=p.side,
            target_digit=p.target_digit,
            barrier=p.barrier,
            stake=p.stake_cents / 100,
            payout=p.payout_cents / 100,
            payout_pct=p.payout_pct,
            status=p.status,  # type: ignore[arg-type]
            opened_at=p.opened_at,
            closed_at=p.closed_at,
            profit=None if p.profit_cents is None else p.profit_cents / 100,
            entry_spot=p.entry_spot,
            exit_spot=p.exit_spot,
            exit_digit=p.exit_digit,
            balance_type=p.account_type,  # type: ignore[arg-type]
            duration_ticks=p.duration_ticks,
            source=p.source,
            auto_session_id=p.auto_session_id,
        )


class PositionPage(CamelModel):
    items: list[PositionOut]
    total: int
    limit: int
    offset: int


class TransactionPage(CamelModel):
    items: list[TransactionOut]
    total: int
    limit: int
    offset: int


class SessionStats(CamelModel):
    total_trades: int
    wins: int
    losses: int
    win_rate: float
    session_pl: float
    since: int


class StartAutoRequest(CamelModel):
    balance_type: BalanceType = "demo"
    symbol: str
    contract_group: ContractGroup
    side: str
    target_digit: int | None = Field(default=None, ge=0, le=9)
    barrier: int | None = Field(default=None, ge=0, le=9)
    duration_ticks: int = Field(default=1, ge=1)
    base_stake: float = Field(gt=0)
    loss_multiple: float = Field(default=2.0, ge=1.0, le=10.0)
    target_profit: float = Field(gt=0)
    target_loss: float = Field(gt=0)


class AutoSessionOut(CamelModel):
    id: str
    is_active: bool
    balance_type: BalanceType
    symbol: str
    contract_group: ContractGroup
    side: str
    target_digit: int | None = None
    barrier: int | None = None
    base_stake: float
    current_stake: float
    loss_multiple: float
    target_profit: float
    target_loss: float
    step: int
    max_steps: int
    consecutive_losses: int
    session_profit: float
    total_trades: int
    wins: int
    losses: int
    stop_reason: str | None = None
    started_at: int
    ended_at: int | None = None

    @classmethod
    def from_row(cls, a: AutoSession) -> "AutoSessionOut":
        return cls(
            id=a.id,
            is_active=a.status == "running",
            balance_type=a.account_type,  # type: ignore[arg-type]
            symbol=a.symbol_id,
            contract_group=a.contract_group,  # type: ignore[arg-type]
            side=a.side,
            target_digit=a.target_digit,
            barrier=a.barrier,
            base_stake=a.base_stake_cents / 100,
            current_stake=a.current_stake_cents / 100,
            loss_multiple=a.loss_multiple,
            target_profit=a.target_profit_cents / 100,
            target_loss=a.target_loss_cents / 100,
            step=a.step,
            max_steps=a.max_steps,
            consecutive_losses=a.consecutive_losses,
            session_profit=a.session_pl_cents / 100,
            total_trades=a.total_trades,
            wins=a.wins,
            losses=a.losses,
            stop_reason=a.stop_reason,
            started_at=a.started_at,
            ended_at=a.ended_at,
        )


class Quote(CamelModel):
    contract: str
    payout_pct: float
    stake: float
    payout: float
    win_probability: float


# ---- settings -------------------------------------------------------------


class ProfileUpdate(CamelModel):
    name: str = Field(min_length=1, max_length=120)


class PasswordChange(CamelModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class TwoFactorSetup(CamelModel):
    secret: str
    otpauth_uri: str


class TwoFactorCode(CamelModel):
    code: str = Field(min_length=6, max_length=6)


class TwoFactorDisable(CamelModel):
    code: str = Field(min_length=6, max_length=6)
    password: str


# ---- copy trading ---------------------------------------------------------


class ProviderOut(CamelModel):
    id: str
    initials: str
    name: str
    risk: str
    return30d: float
    win_rate: float
    trades: int
    followers: int
    min_allocation: float
    is_simulated: bool
    is_following: bool = False
    stake_multiplier: float | None = None


class SubscribeRequest(CamelModel):
    stake_multiplier: float = Field(default=1.0, ge=0.5, le=2.0)


class Eligibility(CamelModel):
    completed_trades: int
    required_trades: int
    total_pl: float
    win_rate: float
    required_win_rate: float
    meets_trades: bool
    meets_profit: bool
    meets_win_rate: bool
    eligible: bool
    is_provider: bool
