# Dash Clone

A portfolio/learning clone of dashbinary.com's trading dashboard UI — React + Tailwind frontend, FastAPI backend.

**This is a demo project only.** Balances, trades, and prices are entirely simulated. There is
no real money, no payment processing, no brokerage integration, and no connection to any real
market data. Do not point this at real funds or present it as a licensed trading platform without
a full rebuild (real pricing/risk engine, licensed brokerage integration, KYC, persistent storage,
proper auth, etc).

## Structure

- `frontend/` — React 19 + TypeScript + Tailwind v4 (Vite). Clones the trading dashboard UI:
  chart, digit/barrier pickers, Matches/Differs · Over/Under · Even/Odd contracts, Auto/Manual
  trade modes, positions panel, account drawer. Currently runs on a self-contained mock price
  feed and trade simulator (`src/hooks/usePriceFeed.ts`, `src/context/AccountContext.tsx`).
- `backend/` — FastAPI service with the same simulated trading logic (in-memory balances,
  positions, a WebSocket tick feed). Not yet wired into the frontend — see "Connecting them"
  below.

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Serves at http://localhost:5173.

## Running the backend

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

Serves at http://localhost:8000 (interactive docs at `/docs`).

## Backend implementation plan

`backend/` is currently a scaffold (in-memory state, three endpoints). The full plan for turning
it into a real backend — data model, synthetic price engine, settlement logic, auto-trade engine,
copy trading, and exactly which third-party integrations (payments, KYC, email) would be needed
and why they're out of scope for this demo — is documented in
[`docs/BACKEND_PLAN.md`](docs/BACKEND_PLAN.md).

## Connecting them

The frontend currently simulates everything client-side so it runs standalone. To wire it to the
backend instead:

1. Replace `usePriceFeed`'s local random walk with a WebSocket connection to
   `ws://localhost:8000/api/market/ticks/{symbol_id}`.
2. Replace `AccountContext`'s local balance/position state with calls to
   `GET/POST /api/account/balance`, `POST /api/trades`, `GET /api/trades`.

## Design notes

Colors, layout, and typography were captured directly from the live site (dark navy theme,
teal/red accents, Inter font) to match it closely. The 3-column desktop layout (positions ·
chart · trade panel) collapses to a single column with a bottom Trade/Positions tab switcher
below the `xl` breakpoint, mirroring the mobile navigation observed on the original site.
