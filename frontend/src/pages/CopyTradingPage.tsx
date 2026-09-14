import { ArrowLeft, Check, Lock, Search, Share2, ShieldCheck, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAccount } from '../context/AccountContext'
import { useUi } from '../context/UiContext'

const REQUIREMENTS = ['0/20 completed trades', 'Positive 30-day P/L', '0.0% / 55% win rate']

// Fictional demo data — not a real trader or real performance figures.
const STRATEGIES = [
  {
    initials: 'JB',
    name: 'Jordan Blake',
    risk: 'Low risk',
    return30d: 3953.79,
    winRate: '100.0%',
    trades: 27,
    followers: 0,
  },
]

export default function CopyTradingPage() {
  const { balances } = useAccount()
  const { openModal } = useUi()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal">
              <Share2 size={13} />
              Social Investing
            </span>
            <h1 className="text-3xl font-bold sm:text-4xl">Copy confident traders.</h1>
            <p className="mt-3 max-w-md text-sm text-muted">
              Follow a strategy you trust. Every new eligible trade is mirrored from your real balance while you
              stay in control.
            </p>
            <Link
              to="/trade"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-teal/50"
            >
              <ArrowLeft size={15} />
              Back to Trade
            </Link>
          </div>

          <div className="w-full rounded-2xl border border-line bg-panel p-5 sm:w-80">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-950 text-amber-500">
                <Lock size={18} />
              </span>
              <div>
                <p className="text-xs text-muted">Copy-trading activation</p>
                <p className="text-xl font-bold">${balances.real.toFixed(2)} USD</p>
              </div>
            </div>
            <p className="mb-4 text-xs text-teal">Minimum account balance required: $100.00</p>
            <button
              onClick={() => openModal('deposit')}
              className="w-full rounded-lg bg-teal py-2 text-sm font-semibold text-bg hover:brightness-110"
            >
              Deposit
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-teal/30 bg-teal/5 p-4 text-sm">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-teal text-[10px] text-teal">
            i
          </span>
          <p className="text-muted">
            You need at least <span className="font-semibold text-text">$100.00 USD</span> in your real account to
            copy a strategy. When you select a provider, a one-time{' '}
            <span className="font-semibold text-text">$100.00 activation fee</span> is deducted.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal">
              <TrendingUp size={13} />
              Strategy Provider
            </span>
            <p className="font-semibold">Become a Copy Trader</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Publish your trading strategy only when you meet the platform's performance standards.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[220px]">
            {REQUIREMENTS.map((r) => (
              <span key={r} className="flex items-center gap-2 text-sm text-muted">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-panel-light">
                  <Check size={10} />
                </span>
                {r}
              </span>
            ))}
          </div>
          <button
            disabled
            className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-lg bg-panel-light px-4 py-2 text-sm text-muted"
          >
            Complete requirements to unlock
            <Lock size={13} />
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Strategy marketplace</h2>
            <p className="text-sm text-muted">Performance is based on completed platform trades.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search a trader"
              className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIES.map((s) => (
            <div key={s.name} className="rounded-2xl border border-line bg-panel p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/20 font-semibold text-teal">
                    {s.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <span className="flex items-center gap-1 text-xs text-teal">
                      <ShieldCheck size={12} />
                      Verified strategy
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-panel-light px-2.5 py-1 text-xs text-muted">{s.risk}</span>
              </div>

              <p className="text-xs text-muted">30D return</p>
              <p className="mb-4 text-2xl font-bold text-teal">
                +{s.return30d.toFixed(2)} USD
              </p>

              <div className="mb-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                <div>
                  <p className="font-semibold">{s.winRate}</p>
                  <p className="text-xs text-muted">win rate</p>
                </div>
                <div>
                  <p className="font-semibold">{s.trades}</p>
                  <p className="text-xs text-muted">trades</p>
                </div>
                <div>
                  <p className="font-semibold">{s.followers}</p>
                  <p className="text-xs text-muted">followers</p>
                </div>
              </div>

              <button
                onClick={() => openModal('deposit')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-sm text-muted hover:border-teal/50 hover:text-text"
              >
                Deposit $100 to activate
                <ArrowLeft size={14} className="rotate-180" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
