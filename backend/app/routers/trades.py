import asyncio

from fastapi import APIRouter, HTTPException

from ..schemas import PlaceTradeRequest, Position
from ..state import store

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("", response_model=list[Position])
async def list_trades() -> list[Position]:
    return store.list_positions()


@router.post("", response_model=Position)
async def place_trade(body: PlaceTradeRequest) -> Position:
    try:
        position = await store.place_trade(
            balance_type=body.balance_type,
            symbol=body.symbol,
            contract=body.contract,
            stake=body.stake,
            payout_pct=body.payout_pct,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    asyncio.create_task(store.resolve_trade(body.balance_type, position.id))
    return position
