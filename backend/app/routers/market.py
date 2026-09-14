import asyncio
import random
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..schemas import Symbol
from ..symbols import SYMBOLS, SYMBOLS_BY_ID

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/symbols", response_model=list[Symbol])
async def list_symbols() -> list[Symbol]:
    return SYMBOLS


@router.websocket("/ticks/{symbol_id}")
async def stream_ticks(websocket: WebSocket, symbol_id: str) -> None:
    if symbol_id not in SYMBOLS_BY_ID:
        await websocket.close(code=4404)
        return

    await websocket.accept()
    price = 9600 + (random.random() - 0.5) * 20

    try:
        while True:
            drift = (random.random() - 0.5) * price * 0.0015
            price = max(1.0, price + drift)
            await websocket.send_json({"time": int(time.time() * 1000), "price": round(price, 2)})
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
