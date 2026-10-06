import pytest

from app.services import copy
from tests.conftest import auth_headers, register, settle_with_digit

SYMBOL = "v10_1s"


def auto_body(**over):
    body = {
        "balanceType": "demo",
        "symbol": SYMBOL,
        "contractGroup": "even_odd",
        "side": "Even",
        "baseStake": 10,
        "lossMultiple": 2,
        "targetProfit": 200,
        "targetLoss": 500,
    }
    body.update(over)
    return body


async def current_auto(client, h):
    return (await client.get("/api/trades/auto", headers=h)).json()


# ---- auto trading ---------------------------------------------------------


async def test_auto_places_first_trade_and_blocks_second_session(client, user):
    _, h = user
    r = await client.post("/api/trades/auto", headers=h, json=auto_body())
    assert r.status_code == 201 and r.json()["isActive"] and r.json()["step"] == 1
    open_ = (await client.get("/api/trades?status=open", headers=h)).json()
    assert open_["total"] == 1 and open_["items"][0]["source"] == "auto" and open_["items"][0]["autoSessionId"] == r.json()["id"]
    dup = await client.post("/api/trades/auto", headers=h, json=auto_body())
    assert dup.status_code == 409


async def test_auto_martingale_progression_and_reset(client, user, engine):
    _, h = user
    await client.post("/api/trades/auto", headers=h, json=auto_body())
    stakes = []
    for digit in (1, 1, 1):  # three losses on Even
        await settle_with_digit(engine, SYMBOL, digit)
        a = await current_auto(client, h)
        stakes.append(a["currentStake"])
    assert stakes == [20.0, 40.0, 80.0]
    a = await current_auto(client, h)
    assert a["consecutiveLosses"] == 3 and a["step"] == 4 and a["losses"] == 3 and a["sessionProfit"] == -70.0

    await settle_with_digit(engine, SYMBOL, 2)  # win at stake 80 -> profit 76.24, resets
    a = await current_auto(client, h)
    assert a["currentStake"] == 10.0 and a["step"] == 1 and a["consecutiveLosses"] == 0 and a["wins"] == 1
    assert a["sessionProfit"] == pytest.approx(-70 + 76.24)
    assert a["isActive"]
    # every trade is chained: exactly one open position at a time
    assert (await client.get("/api/trades?status=open", headers=h)).json()["total"] == 1


async def test_auto_stops_at_target_profit(client, user, engine):
    _, h = user
    await client.post("/api/trades/auto", headers=h, json=auto_body(baseStake=100, targetProfit=50))
    await settle_with_digit(engine, SYMBOL, 2)  # +95.30 >= 50
    a = await current_auto(client, h)
    assert not a["isActive"] and a["stopReason"] == "target_profit" and a["endedAt"]
    assert (await client.get("/api/trades?status=open", headers=h)).json()["total"] == 0
    notes = (await client.get("/api/account/notifications", headers=h)).json()
    assert any(n["title"] == "Auto Trading Goal Hit" for n in notes)


async def test_auto_stops_at_target_loss(client, user, engine):
    _, h = user
    await client.post("/api/trades/auto", headers=h, json=auto_body(baseStake=100, targetLoss=150))
    await settle_with_digit(engine, SYMBOL, 1)  # -100, next 200
    await settle_with_digit(engine, SYMBOL, 1)  # -300 <= -150
    a = await current_auto(client, h)
    assert a["stopReason"] == "target_loss" and a["sessionProfit"] == -300


async def test_auto_stops_at_max_steps(client, user, engine):
    _, h = user
    await client.post("/api/trades/auto", headers=h, json=auto_body(baseStake=1, lossMultiple=1, targetLoss=10_000))
    for _ in range(8):
        await settle_with_digit(engine, SYMBOL, 1)
    a = await current_auto(client, h)
    assert a["stopReason"] == "max_steps" and a["losses"] == 8 and not a["isActive"]


async def test_auto_stops_when_next_stake_is_unaffordable(client, user, engine):
    _, h = user
    await client.post("/api/account/deposit", headers=h, json={"amount": 30, "method": "x"})
    await client.post("/api/trades/auto", headers=h, json=auto_body(balanceType="real", baseStake=10, lossMultiple=3))
    await settle_with_digit(engine, SYMBOL, 1)  # lose 10 -> balance 20, next stake 30 > 20
    a = await current_auto(client, h)
    assert a["stopReason"] == "insufficient_balance" and not a["isActive"]
    assert (await client.get("/api/account/balance", headers=h)).json()["real"] == 20.0


async def test_auto_stops_at_max_stake(client, user, engine):
    _, h = user
    await client.post("/api/trades/auto", headers=h, json=auto_body(baseStake=4000, targetLoss=100_000))
    await settle_with_digit(engine, SYMBOL, 1)  # next stake 8000 > $5000 cap
    assert (await current_auto(client, h))["stopReason"] == "stake_limit"


async def test_auto_manual_stop_lets_inflight_trade_settle(client, user, engine):
    _, h = user
    a = (await client.post("/api/trades/auto", headers=h, json=auto_body())).json()
    stopped = (await client.post(f"/api/trades/auto/{a['id']}/stop", headers=h)).json()
    assert not stopped["isActive"] and stopped["stopReason"] == "manual"
    await settle_with_digit(engine, SYMBOL, 2)
    assert (await client.get("/api/trades?status=open", headers=h)).json()["total"] == 0  # no follow-up trade
    assert (await client.get("/api/trades?status=won", headers=h)).json()["total"] == 1
    # a new session may start afterwards
    assert (await client.post("/api/trades/auto", headers=h, json=auto_body())).status_code == 201


async def test_auto_validation_and_ownership(client, user):
    _, h = user
    for bad in ({"baseStake": 0}, {"targetProfit": 0}, {"lossMultiple": 0.5}, {"baseStake": 0.1}, {"symbol": "zzz"}):
        assert (await client.post("/api/trades/auto", headers=h, json=auto_body(**bad))).status_code in (404, 422)
    assert (await client.get("/api/trades?status=open", headers=h)).json()["total"] == 0
    a = (await client.post("/api/trades/auto", headers=h, json=auto_body())).json()
    other = auth_headers(await register(client, "o@example.com", "O"))
    assert (await client.post(f"/api/trades/auto/{a['id']}/stop", headers=other)).status_code == 404
    assert await current_auto(client, other) is None


# ---- account --------------------------------------------------------------


async def test_deposit_withdraw_and_ledger(client, user):
    _, h = user
    dep = await client.post("/api/account/deposit", headers=h, json={"amount": 250, "method": "M-Pesa STK Push"})
    assert dep.status_code == 200 and dep.json()["balances"]["real"] == 250
    assert dep.json()["transaction"]["type"] == "deposit" and dep.json()["transaction"]["amount"] == 250

    assert (await client.post("/api/account/withdraw", headers=h, json={"amount": 5, "method": "M-Pesa", "destination": "0712"})).status_code == 422
    assert (await client.post("/api/account/withdraw", headers=h, json={"amount": 100, "method": "M-Pesa"})).status_code == 422
    assert (await client.post("/api/account/withdraw", headers=h, json={"amount": 999, "method": "M-Pesa", "destination": "0712"})).status_code == 400
    wd = await client.post("/api/account/withdraw", headers=h, json={"amount": 100, "method": "M-Pesa", "destination": "0712"})
    assert wd.json()["balances"]["real"] == 150 and wd.json()["transaction"]["amount"] == -100

    txs = (await client.get("/api/account/transactions", headers=h)).json()
    assert txs["total"] == 3  # demo grant + deposit + withdrawal
    assert (await client.get("/api/account/transactions?type=withdrawal", headers=h)).json()["total"] == 1
    assert (await client.get("/api/account/transactions?balanceType=real", headers=h)).json()["total"] == 2
    assert (await client.post("/api/account/deposit", headers=h, json={"amount": -5, "method": "x"})).status_code == 422
    assert (await client.post("/api/account/deposit", headers=h, json={"amount": 10**7, "method": "x"})).status_code == 422


async def test_ledger_reconciles_with_balance(client, user, engine):
    _, h = user
    await client.post("/api/account/deposit", headers=h, json={"amount": 1000, "method": "x"})
    for side, digit in (("Even", 2), ("Even", 3), ("Odd", 3)):
        await client.post("/api/trades", headers=h, json={"balanceType": "real", "symbol": SYMBOL, "contractGroup": "even_odd", "side": side, "stake": 37.5})
        await settle_with_digit(engine, SYMBOL, digit)
    txs = (await client.get("/api/account/transactions?balanceType=real&limit=200", headers=h)).json()["items"]
    bal = (await client.get("/api/account/balance", headers=h)).json()["real"]
    assert sum(t["amount"] for t in txs) == pytest.approx(bal)


async def test_reset_demo(client, user):
    _, h = user
    await client.post("/api/trades", headers=h, json={"balanceType": "demo", "symbol": SYMBOL, "contractGroup": "even_odd", "side": "Even", "stake": 500})
    r = await client.post("/api/account/reset-demo", headers=h)
    assert r.json()["balances"]["demo"] == 10000.0


async def test_notifications_read_state(client, user):
    _, h = user
    await client.post("/api/account/deposit", headers=h, json={"amount": 20, "method": "x"})
    notes = (await client.get("/api/account/notifications", headers=h)).json()
    assert len(notes) == 1 and not notes[0]["read"]
    assert (await client.post(f"/api/account/notifications/{notes[0]['id']}/read", headers=h)).status_code == 204
    assert (await client.get("/api/account/notifications", headers=h)).json()[0]["read"]
    assert (await client.post("/api/account/notifications/nope/read", headers=h)).status_code == 404
    assert (await client.post("/api/account/notifications/read-all", headers=h)).status_code == 204


# ---- copy trading ---------------------------------------------------------


async def providers(client, h=None):
    return (await client.get("/api/copy-trading/providers", headers=h or {})).json()


async def test_house_providers_are_seeded_and_flagged(client):
    ps = await providers(client)
    assert [p["name"] for p in ps] == ["Elena Morales", "Jordan Blake", "Sarah Wang"]
    assert all(p["isSimulated"] and p["followers"] == 0 for p in ps)


async def test_subscribe_needs_real_balance_then_mirrors_trades(client, user, engine):
    _, h = user
    pid = (await providers(client))[0]["id"]
    r = await client.post(f"/api/copy-trading/providers/{pid}/subscribe", headers=h, json={"stakeMultiplier": 2})
    assert r.status_code == 400  # real balance $0 < $100 minimum
    await client.post("/api/account/deposit", headers=h, json={"amount": 500, "method": "x"})
    r = await client.post(f"/api/copy-trading/providers/{pid}/subscribe", headers=h, json={"stakeMultiplier": 2})
    assert r.status_code == 200 and r.json()["isFollowing"] and r.json()["followers"] == 1 and r.json()["stakeMultiplier"] == 2
    assert (await client.post(f"/api/copy-trading/providers/{pid}/subscribe", headers=h, json={"stakeMultiplier": 9})).status_code == 422

    assert await copy.provider_trade(pid) == 1
    open_ = (await client.get("/api/trades?status=open", headers=h)).json()["items"]
    assert len(open_) == 1 and open_[0]["source"] == f"copy:{pid}" and open_[0]["balanceType"] == "real" and open_[0]["stake"] == 20.0
    assert (await client.get("/api/account/balance", headers=h)).json()["real"] == 480.0

    # unfollow stops mirroring
    un = await client.post(f"/api/copy-trading/providers/{pid}/unsubscribe", headers=h)
    assert not un.json()["isFollowing"]
    assert await copy.provider_trade(pid) == 0


async def test_mirror_skips_followers_who_cannot_afford_it(client, user):
    _, h = user
    await client.post("/api/account/deposit", headers=h, json={"amount": 100, "method": "x"})
    pid = (await providers(client))[1]["id"]
    await client.post(f"/api/copy-trading/providers/{pid}/subscribe", headers=h, json={"stakeMultiplier": 1})
    await client.post("/api/account/withdraw", headers=h, json={"amount": 95, "method": "x", "destination": "d"})
    assert await copy.provider_trade(pid) == 0
    notes = (await client.get("/api/account/notifications", headers=h)).json()
    assert any(n["title"].startswith("Copy trade skipped") for n in notes)


async def test_become_provider_and_user_provider_mirroring(client, user, engine):
    tokens, h = user
    el = (await client.get("/api/copy-trading/eligibility", headers=h)).json()
    assert not el["eligible"] and el["completedTrades"] == 0
    assert (await client.post("/api/copy-trading/become-provider", headers=h)).status_code == 403

    for _ in range(20):  # 20 manual trades, all wins -> eligible
        await client.post("/api/trades", headers=h, json={"balanceType": "demo", "symbol": SYMBOL, "contractGroup": "even_odd", "side": "Even", "stake": 1})
        await settle_with_digit(engine, SYMBOL, 2)
    el = (await client.get("/api/copy-trading/eligibility", headers=h)).json()
    assert el["eligible"] and el["winRate"] == 100.0 and el["totalPl"] > 0
    prov = await client.post("/api/copy-trading/become-provider", headers=h)
    assert prov.status_code == 201 and not prov.json()["isSimulated"] and prov.json()["trades"] == 20
    assert (await client.post("/api/copy-trading/become-provider", headers=h)).status_code == 409

    # a follower copies the new provider's manual trades into their real account
    fh = auth_headers(await register(client, "follower@example.com", "Follower"))
    await client.post("/api/account/deposit", headers=fh, json={"amount": 300, "method": "x"})
    pid = prov.json()["id"]
    assert (await client.post(f"/api/copy-trading/providers/{pid}/subscribe", headers=fh, json={"stakeMultiplier": 0.5})).status_code == 200
    await client.post("/api/trades", headers=h, json={"balanceType": "demo", "symbol": SYMBOL, "contractGroup": "even_odd", "side": "Odd", "stake": 10})
    copied = (await client.get("/api/trades?status=open", headers=fh)).json()["items"]
    assert len(copied) == 1 and copied[0]["stake"] == 5.0 and copied[0]["side"] == "Odd"
    # providers can't follow themselves
    assert (await client.post(f"/api/copy-trading/providers/{pid}/subscribe", headers=h, json={})).status_code == 400
