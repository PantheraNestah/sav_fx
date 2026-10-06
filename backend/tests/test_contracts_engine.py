import pytest

from app.market.engine import MarketEngine, commitment, epoch_seed, last_digit, step_uniform
from app.events import Hub
from app.services.contracts import ContractError, build_contract, payout_cents


@pytest.mark.parametrize("price,digit", [(9583.15, 5), (9600.0, 0), (9600.07, 7), (100.3, 0), (1234.56, 6)])
def test_last_digit(price, digit):
    assert last_digit(price) == digit


def test_payouts_match_frontend_formula():
    # frontend/src/lib/payouts.ts: (1/p - 1) * 100 * 0.953
    assert build_contract("even_odd", "even").payout_pct == pytest.approx(95.3)
    assert build_contract("matches_differs", "matches", target_digit=3).payout_pct == pytest.approx(857.7)
    assert build_contract("matches_differs", "differs", target_digit=3).payout_pct == pytest.approx(10.59, abs=0.01)
    assert build_contract("over_under", "over", barrier=2).payout_pct == pytest.approx((10 / 7 - 1) * 95.3, abs=0.01)
    assert build_contract("over_under", "under", barrier=2).payout_pct == pytest.approx(381.2, abs=0.01)


def test_payout_amount_rounding():
    assert payout_cents(1000, 95.3) == 1953


@pytest.mark.parametrize("digit", range(10))
def test_win_conditions(digit):
    assert build_contract("even_odd", "Even").wins(digit) == (digit % 2 == 0)
    assert build_contract("even_odd", "Odd").wins(digit) == (digit % 2 == 1)
    assert build_contract("matches_differs", "Matches", target_digit=4).wins(digit) == (digit == 4)
    assert build_contract("matches_differs", "Differs", target_digit=4).wins(digit) == (digit != 4)
    assert build_contract("over_under", "Over", barrier=4).wins(digit) == (digit > 4)
    assert build_contract("over_under", "Under", barrier=4).wins(digit) == (digit < 4)


def test_win_probabilities_are_exact():
    for group, side, kw in [
        ("even_odd", "Even", {}),
        ("matches_differs", "Matches", {"target_digit": 7}),
        ("matches_differs", "Differs", {"target_digit": 7}),
        ("over_under", "Over", {"barrier": 3}),
        ("over_under", "Under", {"barrier": 6}),
    ]:
        c = build_contract(group, side, **kw)
        assert c.win_probability == pytest.approx(sum(c.wins(d) for d in range(10)) / 10)


@pytest.mark.parametrize(
    "args",
    [
        ("nope", "even", None, None),
        ("even_odd", "over", None, None),
        ("matches_differs", "matches", None, None),
        ("matches_differs", "matches", 10, None),
        ("over_under", "over", None, None),
        ("over_under", "over", None, 9),  # can never win
        ("over_under", "under", None, 0),  # can never win
    ],
)
def test_invalid_contracts(args):
    with pytest.raises(ContractError):
        build_contract(*args)


def test_engine_is_deterministic_and_bounded():
    a = MarketEngine(Hub(), "secret", clock=lambda: 1_000_000.0)
    b = MarketEngine(Hub(), "secret", clock=lambda: 1_000_000.0)
    c = MarketEngine(Hub(), "other", clock=lambda: 1_000_000.0)
    for _ in range(50):
        ta, tb, tc = a.advance("v10_1s"), b.advance("v10_1s"), c.advance("v10_1s")
        assert ta.price == tb.price and ta.seq == tb.seq
        assert ta.price > 0
    assert a.latest("v10_1s").price != c.latest("v10_1s").price


def test_engine_history_digits_and_seq():
    e = MarketEngine(Hub(), "s", clock=lambda: 5_000.0)
    hist = e.history("v25_1s", 60)
    assert len(hist) == 60
    assert [t.seq for t in hist] == sorted(t.seq for t in hist)
    assert len({t.seq for t in hist}) == 60
    nxt = e.advance("v25_1s")
    assert nxt.seq == hist[-1].seq + 1
    stats = e.digit_stats("v25_1s", 40)
    assert len(stats) == 10 and sum(d["pct"] for d in stats) == pytest.approx(100, abs=1.0)


def test_last_digit_is_roughly_uniform():
    e = MarketEngine(Hub(), "uniformity", clock=lambda: 9_000.0)
    counts = [0] * 10
    for _ in range(5000):
        counts[e.advance("v50_1s").digit] += 1
    assert min(counts) > 380 and max(counts) < 620  # expected 500 each


def test_fairness_commitment_matches_seed():
    e = MarketEngine(Hub(), "fair", clock=lambda: 3600.0 * 3 + 5)
    f = e.fairness()
    seed = epoch_seed("fair", f["currentEpoch"])
    assert f["currentCommitment"] == commitment(seed)
    for r in f["revealed"]:
        assert commitment(bytes.fromhex(r["seed"])) == r["commitment"]
    assert 0 <= step_uniform(seed, "v10_1s", 1) < 1


async def test_tick_publishes_and_notifies():
    hub = Hub()
    e = MarketEngine(hub, "s")
    seen = []

    async def listener(t):
        seen.append(t)

    e.add_listener(listener)
    with hub.subscribe("ticks:v10_1s") as q:
        t = await e.tick("v10_1s")
        msg = q.get_nowait()
    assert seen == [t] and msg["price"] == t.price and msg["digit"] == t.digit


async def test_failing_listener_does_not_stop_feed():
    e = MarketEngine(Hub(), "s")

    async def boom(_):
        raise RuntimeError("x")

    e.add_listener(boom)
    t = await e.tick("v10_1s")
    assert t.seq == e.latest("v10_1s").seq
