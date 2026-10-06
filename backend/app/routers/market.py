import asyncio

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from .. import runtime
from ..events import hub
from ..schemas import DigitStat, MarketSnapshot, Symbol, Tick
from ..symbols import SYMBOL_SPECS, SYMBOLS_BY_ID

router = APIRouter(tags=["market"])


@router.get("/api/market/symbols", response_model=list[Symbol])
async def list_symbols() -> list[Symbol]:
    return [Symbol(id=s.id, label=s.label, group=s.group) for s in SYMBOL_SPECS]


@router.get("/api/market/fairness")
async def fairness() -> dict:
    """Seed commitments (current epoch) and revealed seeds (past epochs) for auditing the price feed."""
    return runtime.get_engine().fairness()


@router.get("/api/market/{symbol_id}/snapshot", response_model=MarketSnapshot)
async def snapshot(symbol_id: str, limit: int = Query(default=60, ge=2, le=300)) -> MarketSnapshot:
    if symbol_id not in SYMBOLS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown symbol")
    eng = runtime.get_engine()
    ticks = eng.history(symbol_id, limit)
    last, prev = ticks[-1], ticks[-2]
    change = round(last.price - prev.price, 2)
    return MarketSnapshot(
        symbol=symbol_id,
        ticks=[Tick(time=t.time_ms, price=t.price, seq=t.seq, digit=t.digit) for t in ticks],
        digit_stats=[DigitStat(**d) for d in eng.digit_stats(symbol_id)],
        last_digit=last.digit,
        price=last.price,
        change=change,
        change_pct=round(change / prev.price * 100, 4) if prev.price else 0.0,
    )


async def _stream(websocket: WebSocket, symbol_id: str) -> None:
    if symbol_id not in SYMBOLS_BY_ID:
        await websocket.close(code=4404)
        return
    await websocket.accept()
    eng = runtime.get_engine()
    with hub.subscribe(f"ticks:{symbol_id}") as q:
        # Replay recent history so a fresh chart can draw immediately, then go live.
        for t in eng.history(symbol_id, 60):
            await websocket.send_json({"type": "history", **t.as_dict()})
        try:
            while True:
                tick = await q.get()
                await websocket.send_json({"type": "tick", **tick})
        except (WebSocketDisconnect, asyncio.CancelledError):
            return
        except RuntimeError:  # socket closed mid-send
            return


@router.websocket("/ws/ticks/{symbol_id}")
async def ws_ticks(websocket: WebSocket, symbol_id: str) -> None:
    await _stream(websocket, symbol_id)


# Path kept from the original scaffold / README.
@router.websocket("/api/market/ticks/{symbol_id}")
async def ws_ticks_legacy(websocket: WebSocket, symbol_id: str) -> None:
    await _stream(websocket, symbol_id)
