import pytest

from tests.conftest import auth_headers, register, settle_with_digit

SYMBOL = "v10_1s"


def trade_body(**over):
    body = {"balanceType": "demo", "symbol": SYMBOL, "contractGroup": "even_odd", "side": "Even", "stake": 10}
    body.update(over)
    return body


async def balances(client, h):
    return (await client.get("/api/account/balance", headers=h)).json()


async def test_place_trade_debits_stake_and_prices_server_side(client, user):
    _, h = user
    # a client-supplied payout must be ignored (extra fields are not part of the contract)
    r = await client.post("/api/trades", headers=h, json=trade_body(payoutPct=99999))
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["status"] == "open" and p["stake"] == 10 and p["payoutPct"] == pytest.approx(95.3)
    assert p["payout"] == pytest.approx(19.53) and p["contract"] == "Even/Odd · Even" and p["balanceType"] == "demo"
    assert (await balances(client, h))["demo"] == 9990.0


async def test_win_pays_out_and_records_everything(client, user, engine):
    _, h = user
    p = (await client.post("/api/trades", headers=h, json=trade_body(side="Even"))).json()
    assert await settle_with_digit(engine, SYMBOL, 4) == 1
    pos = (await client.get(f"/api/positions/{p['id']}", headers=h)).json()
    assert pos["status"] == "won" and pos["exitDigit"] == 4 and pos["profit"] == pytest.approx(9.53) and pos["closedAt"]
    assert (await balances(client, h))["demo"] == pytest.approx(10009.53)

    tx = (await client.get("/api/positions/transactions", headers=h)).json()
    assert [(t["type"], t["amount"]) for t in tx["items"]] == [("payout", 19.53), ("stake", -10.0)]
    notes = (await client.get("/api/account/notifications", headers=h)).json()
    assert notes[0]["type"] == "win" and "9.53" in notes[0]["title"]


async def test_loss_keeps_stake(client, user, engine):
    _, h = user
    p = (await client.post("/api/trades", headers=h, json=trade_body(side="Even"))).json()
    await settle_with_digit(engine, SYMBOL, 7)
    pos = (await client.get(f"/api/positions/{p['id']}", headers=h)).json()
    assert pos["status"] == "lost" and pos["profit"] == -10
    assert (await balances(client, h))["demo"] == 9990.0


@pytest.mark.parametrize(
    "extra,digit,won",
    [
        ({"contractGroup": "matches_differs", "side": "Matches", "targetDigit": 3}, 3, True),
        ({"contractGroup": "matches_differs", "side": "Matches", "targetDigit": 3}, 4, False),
        ({"contractGroup": "matches_differs", "side": "Differs", "targetDigit": 3}, 4, True),
        ({"contractGroup": "over_under", "side": "Over", "barrier": 2}, 3, True),
        ({"contractGroup": "over_under", "side": "Over", "barrier": 2}, 2, False),
        ({"contractGroup": "over_under", "side": "Under", "barrier": 2}, 1, True),
        ({"contractGroup": "over_under", "side": "Under", "barrier": 2}, 2, False),
    ],
)
async def test_digit_contracts_settle_on_exit_digit(client, user, engine, extra, digit, won):
    _, h = user
    p = (await client.post("/api/trades", headers=h, json=trade_body(**extra))).json()
    await settle_with_digit(engine, SYMBOL, digit)
    assert (await client.get(f"/api/positions/{p['id']}", headers=h)).json()["status"] == ("won" if won else "lost")


async def test_duration_ticks_and_symbol_isolation(client, user, engine):
    _, h = user
    p = (await client.post("/api/trades", headers=h, json=trade_body(durationTicks=3))).json()
    assert await settle_with_digit(engine, "v25_1s", 0) == 0  # other symbol: untouched
    assert await settle_with_digit(engine, SYMBOL, 0) == 0  # 1 of 3 ticks
    assert await settle_with_digit(engine, SYMBOL, 0) == 0  # 2 of 3
    assert await settle_with_digit(engine, SYMBOL, 0) == 1  # 3 of 3
    assert (await client.get(f"/api/positions/{p['id']}", headers=h)).json()["status"] == "won"


async def test_settlement_is_idempotent(client, user, engine):
    _, h = user
    await client.post("/api/trades", headers=h, json=trade_body())
    await settle_with_digit(engine, SYMBOL, 2)
    first = (await balances(client, h))["demo"]
    assert await settle_with_digit(engine, SYMBOL, 2) == 0
    assert (await balances(client, h))["demo"] == first


async def test_desired_payout_mode(client, user):
    _, h = user
    body = trade_body(stake=None, desiredPayout=19.53)
    del body["stake"]
    p = (await client.post("/api/trades", headers=h, json=body)).json()
    assert p["stake"] == pytest.approx(10.0) and p["payout"] == pytest.approx(19.53)


@pytest.mark.parametrize(
    "extra,status",
    [
        ({"stake": 0}, 422),
        ({"stake": -5}, 422),
        ({"stake": 0.1}, 422),  # below minimum stake
        ({"stake": 5001}, 422),  # above maximum stake
        ({"symbol": "nope"}, 404),
        ({"side": "Sideways"}, 422),
        ({"contractGroup": "matches_differs", "side": "Matches"}, 422),  # missing digit
        ({"contractGroup": "over_under", "side": "Over", "barrier": 9}, 422),  # unwinnable
        ({"durationTicks": 0}, 422),
        ({"durationTicks": 11}, 422),
        ({"balanceType": "bogus"}, 422),
    ],
)
async def test_validation(client, user, extra, status):
    _, h = user
    r = await client.post("/api/trades", headers=h, json=trade_body(**extra))
    assert r.status_code == status, r.text
    assert (await balances(client, h))["demo"] == 10000.0


async def test_stake_and_desired_payout_are_mutually_exclusive(client, user):
    _, h = user
    r = await client.post("/api/trades", headers=h, json=trade_body(desiredPayout=20))
    assert r.status_code == 422
    body = trade_body()
    del body["stake"]
    assert (await client.post("/api/trades", headers=h, json=body)).status_code == 422


async def test_insufficient_balance_and_never_negative(client, user):
    _, h = user
    r = await client.post("/api/trades", headers=h, json=trade_body(balanceType="real"))  # real balance is $0
    assert r.status_code == 400 and r.json()["detail"]["code"] == "insufficient_funds"
    assert (await balances(client, h))["real"] == 0
    assert (await client.get("/api/trades", headers=h)).json()["total"] == 0  # no ghost position

    for _ in range(2):  # 2 x 5000 fits, third does not
        assert (await client.post("/api/trades", headers=h, json=trade_body(stake=5000))).status_code == 201
    assert (await client.post("/api/trades", headers=h, json=trade_body(stake=5000))).status_code == 400
    assert (await balances(client, h))["demo"] == 0


async def test_concurrent_trades_cannot_overspend(client, user):
    import asyncio

    _, h = user
    rs = await asyncio.gather(*[client.post("/api/trades", headers=h, json=trade_body(stake=3000)) for _ in range(6)])
    assert sorted(r.status_code for r in rs) == [201, 201, 201, 400, 400, 400]
    assert (await balances(client, h))["demo"] == 1000.0


async def test_requires_auth_and_ownership(client, user):
    _, h = user
    assert (await client.post("/api/trades", json=trade_body())).status_code == 401
    p = (await client.post("/api/trades", headers=h, json=trade_body())).json()
    other = auth_headers(await register(client, "other@example.com", "Other"))
    assert (await client.get(f"/api/positions/{p['id']}", headers=other)).status_code == 404
    assert (await client.get("/api/trades", headers=other)).json()["total"] == 0


async def test_rate_limit(client, user, settings_env):
    from app.services import trading

    _, h = user
    trading.limiter().capacity = 3
    trading.limiter().rate = 0
    trading.limiter().reset()
    codes = [(await client.post("/api/trades", headers=h, json=trade_body(stake=1))).status_code for _ in range(5)]
    assert codes == [201, 201, 201, 429, 429]


async def test_list_filters_pagination_and_stats(client, user, engine):
    _, h = user
    for _ in range(3):
        await client.post("/api/trades", headers=h, json=trade_body(side="Even"))
    await settle_with_digit(engine, SYMBOL, 2)  # all 3 win
    await client.post("/api/trades", headers=h, json=trade_body(side="Even"))
    await settle_with_digit(engine, SYMBOL, 1)  # 1 loss
    await client.post("/api/trades", headers=h, json=trade_body(side="Even"))  # stays open

    allp = (await client.get("/api/positions", headers=h)).json()
    assert allp["total"] == 5
    assert (await client.get("/api/trades?status=open", headers=h)).json()["total"] == 1
    assert (await client.get("/api/trades?status=closed", headers=h)).json()["total"] == 4
    assert (await client.get("/api/trades?status=won", headers=h)).json()["total"] == 3
    page = (await client.get("/api/trades?limit=2&offset=4", headers=h)).json()
    assert len(page["items"]) == 1 and page["total"] == 5
    assert (await client.get("/api/trades?status=bogus", headers=h)).status_code == 422

    s = (await client.get("/api/positions/stats", headers=h)).json()
    assert (s["totalTrades"], s["wins"], s["losses"], s["winRate"]) == (4, 3, 1, 75.0)
    assert s["sessionPl"] == pytest.approx(3 * 9.53 - 10)


async def test_quote_endpoint_is_public(client):
    r = await client.get("/api/trades/quote", params={"contractGroup": "over_under", "side": "Over", "barrier": 2, "stake": 10})
    assert r.status_code == 200
    q = r.json()
    assert q["contract"] == "Over/Under · Over 2" and q["winProbability"] == 0.7
    assert (await client.get("/api/trades/quote", params={"contractGroup": "over_under", "side": "Over", "barrier": 9})).status_code == 422


async def test_market_endpoints(client, engine):
    syms = (await client.get("/api/market/symbols")).json()
    assert len(syms) == 8 and {"id", "label", "group"} <= syms[0].keys()
    snap = (await client.get(f"/api/market/{SYMBOL}/snapshot")).json()
    assert len(snap["ticks"]) == 60 and len(snap["digitStats"]) == 10 and 0 <= snap["lastDigit"] <= 9
    assert (await client.get("/api/market/nope/snapshot")).status_code == 404
    fair = (await client.get("/api/market/fairness")).json()
    assert len(fair["currentCommitment"]) == 64
    assert (await client.get("/api/health")).json()["status"] == "ok"
