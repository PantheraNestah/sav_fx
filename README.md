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
- `backend/` — FastAPI service: auth, persistent ledger, synthetic tick engine, tick-driven
  settlement, auto-trading, copy trading and WebSocket push. Optionally used by the frontend
  (see "Connecting the frontend to the backend").

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
./.venv/bin/pip install -r requirements-dev.txt
./.venv/bin/uvicorn app.main:app --reload --port 8000
./.venv/bin/python -m pytest        # 97 tests
```

Serves at http://localhost:8000 (interactive docs at `/docs`). Defaults to a local SQLite file
(`dash.db`); set `DATABASE_URL=postgresql+asyncpg://...` (and `pip install asyncpg`) for Postgres.
See `backend/.env.example` for all settings. With `ENV=production` it refuses to start without
real `JWT_SECRET` / `ENGINE_SECRET` values.

### What the backend does

| Area | Details |
|---|---|
| Auth | Register / login, 15-min JWT access tokens, rotating refresh tokens with reuse detection, logout, login lockout, password reset tokens (email delivery is a logging stub), TOTP 2FA |
| Market | Deterministic HMAC-seeded synthetic volatility indices (no real market data), tick history + digit stats, `/ws/ticks/{symbol}`, public seed commitments at `/api/market/fairness` |
| Trading | Even/Odd, Matches/Differs, Over/Under contracts priced **server-side**, atomic stake debit (balance can never go negative), settled on the exit tick's last digit, 1-10 tick durations, "stake" or "desired payout" entry |
| Auto trading | Loss-multiple (martingale) sessions with target profit / target loss / 8-step / balance guards |
| Account | Real + demo balances, append-only ledger, **simulated** deposits/withdrawals, demo reset, notifications, session stats |
| Copy trading | Providers, subscribe/unsubscribe, eligibility, become-provider, mirrored trades (house providers are flagged `isSimulated`) |
| Realtime | `/ws/account?token=` pushes balance, position and notification events |

Everything is simulated: no payment processor, no brokerage, no real market data. Money-moving
integrations are deliberately out of scope - see `docs/BACKEND_PLAN.md` section 13.

## Connecting the frontend to the backend

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL=http://localhost:8000`, then
`npm run dev`. With that set the frontend uses real accounts (login/register are enforced),
server-side settlement, the WebSocket price feed and the account push channel. Leave it empty to
keep the self-contained browser simulator. For a deployed frontend, add its origin to the backend's
`CORS_ORIGINS` (or `CORS_ORIGIN_REGEX` for Vercel previews).

## Design notes

Colors, layout, and typography were captured directly from the live site (dark navy theme,
teal/red accents, Inter font) to match it closely. The 3-column desktop layout (positions ·
chart · trade panel) collapses to a single column with a bottom Trade/Positions tab switcher
below the `xl` breakpoint, mirroring the mobile navigation observed on the original site.
