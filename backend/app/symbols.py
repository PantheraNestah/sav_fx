from dataclasses import dataclass


@dataclass(frozen=True)
class SymbolSpec:
    id: str
    label: str
    group: str
    base_price: float
    # Max single-tick move as a fraction of price (uniform in +/- volatility/2).
    volatility: float
    interval_seconds: float


def _spec(id: str, label: str, base: float, vol: float, interval: float) -> SymbolSpec:
    return SymbolSpec(id, label, "Continuous Indices", base, vol, interval)


SYMBOL_SPECS: list[SymbolSpec] = [
    _spec("v10_1s", "Volatility 10 (1s) Index", 9600.0, 0.0006, 1.0),
    _spec("v10", "Volatility 10 Index", 6700.0, 0.0006, 2.0),
    _spec("v15_1s", "Volatility 15 (1s) Index", 9600.0, 0.0009, 1.0),
    _spec("v25_1s", "Volatility 25 (1s) Index", 9600.0, 0.0015, 1.0),
    _spec("v25", "Volatility 25 Index", 3100.0, 0.0015, 2.0),
    _spec("v30_1s", "Volatility 30 (1s) Index", 9600.0, 0.0018, 1.0),
    _spec("v50_1s", "Volatility 50 (1s) Index", 9600.0, 0.003, 1.0),
    _spec("v50", "Volatility 50 Index", 260.0, 0.003, 2.0),
]

SYMBOLS_BY_ID: dict[str, SymbolSpec] = {s.id: s for s in SYMBOL_SPECS}
