from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import account, market, trades

app = FastAPI(
    title="Dash Clone API",
    description=(
        "Demo/portfolio backend. All balances, trades, and prices are "
        "simulated in memory — no real money, payments, or market data."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(account.router)
app.include_router(trades.router)
app.include_router(market.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
