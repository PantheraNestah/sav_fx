"""WebSocket tests use Starlette's TestClient (own event loop + real lifespan)."""

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect


@pytest.fixture
def tc(settings_env):
    from app.main import create_app

    with TestClient(create_app()) as c:
        yield c


def _register(tc):
    r = tc.post("/api/auth/register", json={"fullName": "WS User", "email": "ws@example.com", "password": "password123"})
    assert r.status_code == 201
    return r.json()["accessToken"]


def test_tick_stream_replays_history_then_goes_live(tc):
    from app import runtime

    with tc.websocket_connect("/ws/ticks/v10_1s") as ws:
        first = [ws.receive_json() for _ in range(60)]
        assert all(m["type"] == "history" for m in first)
        assert [m["seq"] for m in first] == sorted(m["seq"] for m in first)
        tc.portal.call(runtime.get_engine().tick, "v10_1s")
        live = ws.receive_json()
        assert live["type"] == "tick" and live["symbol"] == "v10_1s" and 0 <= live["digit"] <= 9


def test_legacy_tick_path_and_unknown_symbol(tc):
    with tc.websocket_connect("/api/market/ticks/v25") as ws:
        assert ws.receive_json()["type"] == "history"
    with pytest.raises(WebSocketDisconnect) as exc:
        with tc.websocket_connect("/ws/ticks/nope"):
            pass
    assert exc.value.code == 4404


def test_account_socket_rejects_bad_tokens(tc):
    for url in ("/ws/account", "/ws/account?token=junk"):
        with pytest.raises(WebSocketDisconnect) as exc:
            with tc.websocket_connect(url):
                pass
        assert exc.value.code == 4401


def test_account_socket_pushes_trade_lifecycle(tc):
    from app import runtime
    from app.market.engine import TickEvent
    from app.services import trading

    token = _register(tc)
    h = {"Authorization": f"Bearer {token}"}
    with tc.websocket_connect(f"/ws/account?token={token}") as ws:
        assert ws.receive_json() == {"type": "balance", "data": {"real": 0.0, "demo": 10000.0}}
        r = tc.post("/api/trades", headers=h, json={"balanceType": "demo", "symbol": "v10_1s", "contractGroup": "even_odd", "side": "Even", "stake": 10})
        assert r.status_code == 201
        opened = ws.receive_json()
        assert opened["type"] == "position.opened" and opened["data"]["id"] == r.json()["id"]
        assert ws.receive_json() == {"type": "balance", "data": {"real": 0.0, "demo": 9990.0}}

        eng = runtime.get_engine()
        st = eng.states["v10_1s"]
        st.seq += 1
        tc.portal.call(trading.settle_tick, TickEvent("v10_1s", st.seq, 0, 9600.02))
        kinds = [ws.receive_json()["type"] for _ in range(3)]
        assert kinds == ["position.settled", "balance", "notification"]


def test_live_engine_settles_a_trade_end_to_end(settings_env):
    """Real tick loop (fast interval) -> a placed trade settles on its own."""
    import time

    from app import runtime
    from app.main import create_app

    settings_env.setenv("TICK_ENGINE_ENABLED", "true")
    settings_env.setenv("PROVIDER_BOT_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    with TestClient(create_app()) as c:
        for spec in runtime.get_engine().specs:  # specs are shared module state: restore afterwards
            object.__setattr__(spec, "interval_seconds", 0.05)
        token = c.post("/api/auth/register", json={"fullName": "Live", "email": "live@example.com", "password": "password123"}).json()["accessToken"]
        h = {"Authorization": f"Bearer {token}"}
        pid = c.post("/api/trades", headers=h, json={"balanceType": "demo", "symbol": "v10_1s", "contractGroup": "even_odd", "side": "Even", "stake": 5}).json()["id"]
        deadline = time.time() + 5
        status = "open"
        while time.time() < deadline and status == "open":
            time.sleep(0.2)
            status = c.get(f"/api/positions/{pid}", headers=h).json()["status"]
        assert status in ("won", "lost")
        pos = c.get(f"/api/positions/{pid}", headers=h).json()
        assert pos["exitDigit"] is not None and pos["exitSpot"] is not None
        bal = c.get("/api/account/balance", headers=h).json()["demo"]
        assert bal == (10000 - 5 + (pos["payout"] if status == "won" else 0))
        for spec in runtime.get_engine().specs:
            object.__setattr__(spec, "interval_seconds", 2.0 if not spec.id.endswith("1s") else 1.0)
