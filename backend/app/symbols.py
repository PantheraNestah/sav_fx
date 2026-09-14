from .schemas import Symbol

SYMBOLS: list[Symbol] = [
    Symbol(id="v10_1s", label="Volatility 10 (1s) Index", group="Continuous Indices"),
    Symbol(id="v10", label="Volatility 10 Index", group="Continuous Indices"),
    Symbol(id="v15_1s", label="Volatility 15 (1s) Index", group="Continuous Indices"),
    Symbol(id="v25_1s", label="Volatility 25 (1s) Index", group="Continuous Indices"),
    Symbol(id="v25", label="Volatility 25 Index", group="Continuous Indices"),
    Symbol(id="v30_1s", label="Volatility 30 (1s) Index", group="Continuous Indices"),
    Symbol(id="v50_1s", label="Volatility 50 (1s) Index", group="Continuous Indices"),
    Symbol(id="v50", label="Volatility 50 Index", group="Continuous Indices"),
]

SYMBOLS_BY_ID = {s.id: s for s in SYMBOLS}
