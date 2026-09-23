import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Lock,
  Search,
  Share2,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from '../context/useAccount'
import { useToast } from '../context/useToast'
import { useUi } from '../context/useUi'

interface Strategy {
  id: string
  initials: string
  name: string
  risk: string
  return30d: number
  winRate: string
  trades: number
  followers: number
  minAllocation: number
}

const STRATEGIES: Strategy[] = [
  {
    id: 'strat-1',
    initials: 'JB',
    name: 'Jordan Blake',
    risk: 'Low risk',
    return30d: 3953.79,
    winRate: '88.4%',
    trades: 142,
    followers: 28,
    minAllocation: 100,
  },
  {
    id: 'strat-2',
    initials: 'SW',
    name: 'Sarah Wang',
    risk: 'Moderate',
    return30d: 5820.40,
    winRate: '79.2%',
    trades: 289,
    followers: 64,
    minAllocation: 150,
  },
  {
    id: 'strat-3',
    initials: 'EM',
    name: 'Elena Morales',
    risk: 'Conservative',
    return30d: 2110.15,
    winRate: '92.1%',
    trades: 95,
    followers: 19,
    minAllocation: 100,
  },
]

export function CopyTradingPage() {
  const { balances, sessionStats } = useAccount()
  const { openModal } = useUi()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [activeStrategy, setActiveStrategy] = useState<Strategy | null>(null)
  const [multiplier, setMultiplier] = useState(1)
  const [followedIds, setFollowedIds] = useState<string[]>([])

  const filteredStrategies = STRATEGIES.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.risk.toLowerCase().includes(search.toLowerCase()),
  )

  // Real eligibility criteria checks against live user session
  const reqTrades = sessionStats.totalTrades >= 20
  const reqProfit = sessionStats.sessionPl > 0
  const reqWinRate = sessionStats.winRate >= 55

  function handleFollow(strat: Strategy) {
    if (balances.real < 100) {
      openModal('deposit')
      return
    }
    setActiveStrategy(strat)
  }

  function confirmFollow() {
    if (!activeStrategy) return
    setFollowedIds((prev) => [...prev, activeStrategy.id])
    showToast({
      title: `Subscribed to ${activeStrategy.name}`,
      message: `Trades will be mirrored at ${multiplier}x stake multiplier.`,
      type: 'success',
    })
    setActiveStrategy(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div
        className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal">
              <Share2 size={13} />
              Social Investing & Copy Trading
            </span>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Copy confident traders.</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Follow a strategy you trust. Every new eligible continuous index contract is mirrored directly into your real account.
            </p>
            <Link
              to="/trade"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-semibold hover:border-teal/50"
            >
              <ArrowLeft size={14} />
              Back to Trade
            </Link>
          </div>

          <div className="w-full rounded-2xl border border-line bg-panel p-5 sm:w-80 shadow-lg">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/60 text-amber-400 border border-amber-500/20">
                <Lock size={18} />
              </span>
              <div>
                <p className="text-xs text-muted">Real Account Balance</p>
                <p className="text-xl font-bold font-mono">${balances.real.toFixed(2)} USD</p>
              </div>
            </div>
            <p className="mb-4 text-xs text-teal">
              {balances.real >= 100
                ? '✓ Eligible to activate copy trading'
                : 'Minimum account balance required: $100.00'}
            </p>
            <button
              onClick={() => openModal('deposit')}
              className="w-full rounded-xl bg-teal py-2.5 text-xs font-bold text-bg hover:brightness-110"
            >
              Deposit to Real Balance
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-teal/30 bg-teal/5 p-4 text-xs">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-teal text-[10px] text-teal">
            i
          </span>
          <p className="text-muted leading-relaxed">
            You need at least <span className="font-bold text-text">$100.00 USD</span> in your real account to copy a strategy. When active, subscriber trades mirror provider entries in real-time with your custom stake multiplier.
          </p>
        </div>

        {/* Strategy Provider Checklist */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal">
              <TrendingUp size={13} />
              Strategy Provider Program
            </span>
            <p className="font-bold text-base">Become a Strategy Provider</p>
            <p className="mt-0.5 max-w-sm text-xs text-muted">
              Earn 20% profit share on follower wins once you meet standard performance criteria.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-[240px]">
            <span className={`flex items-center gap-2 text-xs font-medium ${reqTrades ? 'text-teal font-bold' : 'text-muted'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${reqTrades ? 'bg-teal text-bg' : 'bg-panel-light'}`}>
                <Check size={10} />
              </span>
              {sessionStats.totalTrades}/20 completed trades
            </span>

            <span className={`flex items-center gap-2 text-xs font-medium ${reqProfit ? 'text-teal font-bold' : 'text-muted'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${reqProfit ? 'bg-teal text-bg' : 'bg-panel-light'}`}>
                <Check size={10} />
              </span>
              Positive session P/L ({sessionStats.sessionPl >= 0 ? `+$${sessionStats.sessionPl}` : `-$${Math.abs(sessionStats.sessionPl)}`})
            </span>

            <span className={`flex items-center gap-2 text-xs font-medium ${reqWinRate ? 'text-teal font-bold' : 'text-muted'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${reqWinRate ? 'bg-teal text-bg' : 'bg-panel-light'}`}>
                <Check size={10} />
              </span>
              {sessionStats.winRate}% / 55% win rate
            </span>
          </div>

          <button
            disabled={!reqTrades || !reqProfit || !reqWinRate}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              reqTrades && reqProfit && reqWinRate
                ? 'bg-teal text-bg hover:brightness-110'
                : 'cursor-not-allowed bg-panel-light text-muted'
            }`}
          >
            {reqTrades && reqProfit && reqWinRate ? 'Apply as Provider' : 'Requirements Incomplete'}
            <Lock size={13} />
          </button>
        </div>

        {/* Strategy Marketplace */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Strategy Marketplace</h2>
            <p className="text-xs text-muted">Audited trader performance across synthetic continuous indices</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search strategy or risk..."
              className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-xs outline-none focus:border-teal placeholder:text-muted"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStrategies.map((s) => {
            const isFollowing = followedIds.includes(s.id)

            return (
              <div key={s.id} className="rounded-2xl border border-line bg-panel p-5 shadow-sm hover:border-teal/50 transition">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/20 font-bold text-teal">
                      {s.initials}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{s.name}</p>
                      <span className="flex items-center gap-1 text-[11px] text-teal">
                        <ShieldCheck size={12} />
                        Verified strategy
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-panel-light px-2.5 py-0.5 text-[10px] font-semibold text-muted">
                    {s.risk}
                  </span>
                </div>

                <p className="text-xs text-muted">30D Verified Return</p>
                <p className="mb-4 text-2xl font-extrabold font-mono text-teal">
                  +${s.return30d.toFixed(2)} USD
                </p>

                <div className="mb-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                  <div>
                    <p className="font-bold">{s.winRate}</p>
                    <p className="text-[10px] text-muted">win rate</p>
                  </div>
                  <div>
                    <p className="font-bold">{s.trades}</p>
                    <p className="text-[10px] text-muted">trades</p>
                  </div>
                  <div>
                    <p className="font-bold">{s.followers + (isFollowing ? 1 : 0)}</p>
                    <p className="text-[10px] text-muted">followers</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFollow(s)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                    isFollowing
                      ? 'bg-teal/20 text-teal border border-teal/40'
                      : balances.real < 100
                        ? 'border border-line text-muted hover:border-teal/50 hover:text-text'
                        : 'bg-teal text-bg hover:brightness-110'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <CheckCircle2 size={14} /> Following (Active)
                    </>
                  ) : balances.real < 100 ? (
                    'Deposit $100 to Activate'
                  ) : (
                    'Follow Strategy'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Follow Configuration Modal */}
        {activeStrategy && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveStrategy(null)} />
            <div className="relative w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-2xl border border-line bg-panel p-5 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                <h3 className="font-bold text-base">Configure Copy: {activeStrategy.name}</h3>
                <button onClick={() => setActiveStrategy(null)} className="rounded-lg p-1 text-muted hover:text-text">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-muted block mb-1.5">Stake Multiplier</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.5, 1, 1.5, 2].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMultiplier(m)}
                        className={`rounded-lg border py-2 text-xs font-bold ${
                          multiplier === m ? 'border-teal bg-teal/15 text-teal' : 'border-line text-muted hover:text-text'
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-panel-light p-3 space-y-1.5 text-muted">
                  <div className="flex justify-between">
                    <span>Trader Win Rate</span>
                    <span className="font-bold text-text">{activeStrategy.winRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Risk</span>
                    <span className="font-bold text-text">{activeStrategy.risk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activation Fee</span>
                    <span className="text-teal font-bold">Free (Simulation)</span>
                  </div>
                </div>

                <button
                  onClick={confirmFollow}
                  className="w-full rounded-xl bg-teal py-2.5 text-sm font-bold text-bg hover:brightness-110"
                >
                  Start Mirroring Trades
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CopyTradingPage
