from typing import Literal

from pydantic import BaseModel, Field

BalanceType = Literal["real", "demo"]
PositionStatus = Literal["open", "won", "lost"]


class Symbol(BaseModel):
    id: str
    label: str
    group: str


class Balances(BaseModel):
    real: float
    demo: float


class Tick(BaseModel):
    time: int
    price: float


class Position(BaseModel):
    id: str
    symbol: str
    contract: str
    stake: float
    payout: float
    status: PositionStatus
    opened_at: int
    closed_at: int | None = None
    profit: float | None = None


class PlaceTradeRequest(BaseModel):
    balance_type: BalanceType
    symbol: str
    contract: str
    stake: float = Field(gt=0)
    payout_pct: float = Field(ge=0)


class ResetDemoResponse(BaseModel):
    balances: Balances
