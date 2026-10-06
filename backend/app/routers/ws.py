import asyncio

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from .. import db
from ..deps import user_from_token
from ..events import hub
from ..services import ledger

router = APIRouter(tags=["ws"])


@router.websocket("/ws/account")
async def ws_account(websocket: WebSocket, token: str = Query(default="")) -> None:
    """Pushes `balance`, `position.opened`, `position.settled`, `auto.update`, `notification` events.

    The JWT is verified before the upgrade is accepted; invalid tokens are rejected with 4401.
    """
    async with db.new_session() as s:
        try:
            user = await user_from_token(s, token)
        except HTTPException:
            await websocket.close(code=4401)
            return
        balances = await ledger.get_balances(s, user.id)

    await websocket.accept()
    with hub.subscribe(f"user:{user.id}") as q:
        await websocket.send_json({"type": "balance", "data": {"real": balances["real"] / 100, "demo": balances["demo"] / 100}})
        try:
            while True:
                await websocket.send_json(await q.get())
        except (WebSocketDisconnect, asyncio.CancelledError, RuntimeError):
            return
