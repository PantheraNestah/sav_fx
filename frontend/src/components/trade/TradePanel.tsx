import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CircleSlash,
  Expand,
  Info,
  Minus,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAccount } from '../../context/AccountContext'
import { evenOddPayout, matchesDiffersPayout, overUnderPayout } from '../../lib/payouts'
import type { ContractGroup, StakeMode, Symbol, TradeMode } from '../../types'

const GROUPS: { id: ContractGroup; label: string }[] = [
  { id: 'matches_differs', label: 'Matches/Differs' },
  { id: 'over_under', label: 'Over/Under' },
  { id: 'even_odd', label: 'Even/Odd' },
]

const QUICK_AMOUNTS = [1, 5, 10, 25, 50]

function EvenIcon() {
  return <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full bg-teal" />
}

function OddIcon() {
  return (
    <span className="relative inline-block h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-red align-middle">
      <span className="absolute inset-y-0 left-0 w-1/2 bg-red" />
    </span>
  )
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function TradePanel({ symbol }: { symbol: Symbol }) {
  const { balances, balanceType, placeTrade } = useAccount()
  const [group, setGroup] = useState<ContractGroup>('even_odd')
  const [mode, setMode] = useState<TradeMode>('auto')
  const [stakeMode, setStakeMode] = useState<StakeMode>('stake')
  const [stake, setStake] = useState(10)
  const [targetProfit, setTargetProfit] = useState(200)
  const [targetLoss, setTargetLoss] = useState(999)
  const [lossMultiple, setLossMultiple] = useState(2)
  const [pickedDigit, setPickedDigit] = useState(5)
  const [barrier, setBarrier] = useState(5)
  const [fullscreen, setFullscreen] = useState(false)
  const now = useClock()

  const balance = balances[balanceType]

  const evenOdd = useMemo(() => evenOddPayout(), [])
  const matchesDiffers = useMemo(() => matchesDiffersPayout(pickedDigit), [pickedDigit])
  const overUnder = useMemo(() => overUnderPayout(barrier), [barrier])

  function trade(side: string, payoutPct: number) {
    if (stake <= 0 || stake > balance) return
    placeTrade(`${GROUPS.find((g) => g.id === group)?.label} · ${side}`, symbol.label, stake, payoutPct)
  }

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false })

  return (
    <div
      className={`flex flex-col p-3 xl:h-full xl:min-h-0 xl:overflow-y-auto ${fullscreen ? 'fixed inset-0 z-50 overflow-y-auto bg-bg' : ''}`}
    >
      <button className="mb-3 flex items-center gap-1.5 self-start text-xs text-muted hover:text-text">
        <Info size={13} />
        Learn about this trade type
      </button>

      <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-lg bg-panel p-1">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroup(g.id)}
            className={`rounded-md py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
              group === g.id ? 'border border-teal bg-teal/10 text-teal' : 'text-muted hover:text-text'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Trade Mode</span>
        <span className="text-[11px] text-muted">{mode === 'auto' ? 'Runs until target hit' : 'One trade per click'}</span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-lg bg-panel p-1">
        {(['auto', 'manual'] as TradeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md py-2 text-sm font-semibold capitalize transition-colors ${
              mode === m ? 'bg-panel-light text-text' : 'text-muted hover:text-text'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'auto' && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <NumberBox
            icon={<Target size={12} />}
            label="Target Profit"
            value={targetProfit}
            onChange={setTargetProfit}
            prefix="$"
            color="text-teal"
          />
          <NumberBox
            icon={<AlertTriangle size={12} />}
            label="Target Loss"
            value={targetLoss}
            onChange={setTargetLoss}
            prefix="$"
            color="text-red"
          />
          <NumberBox
            icon={<TrendingDown size={12} />}
            label="Loss Multiple"
            value={lossMultiple}
            onChange={setLossMultiple}
            prefix="x"
            color="text-amber-400"
          />
        </div>
      )}

      <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-lg bg-panel p-1">
        {(['stake', 'payout'] as StakeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setStakeMode(m)}
            className={`rounded-md py-2 text-sm font-semibold capitalize transition-colors ${
              stakeMode === m ? 'bg-panel-light text-text' : 'text-muted hover:text-text'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => setStake((v) => Math.max(1, v - 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:text-text"
        >
          <Minus size={14} />
        </button>
        <div className="flex flex-1 items-center justify-between rounded-lg border border-line px-3 py-2">
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
          <span className="text-xs text-muted">USD</span>
        </div>
        <button
          onClick={() => setStake((v) => v + 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:text-text"
        >
          <Plus size={14} />
        </button>
        <button className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg border border-teal/40 bg-teal/10 px-3 py-1.5 text-teal">
          <span className="flex items-center gap-1 text-xs font-semibold">
            <Sparkles size={12} /> AI Scanner
          </span>
          <span className="text-[9px] text-teal/70">Find best setup</span>
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => setStake((v) => v + a)}
            className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:border-teal/50 hover:text-text"
          >
            +{a}
          </button>
        ))}
      </div>

      {group === 'matches_differs' && (
        <DigitPicker label="Last Digit Prediction" value={pickedDigit} onChange={setPickedDigit} />
      )}
      {group === 'over_under' && <DigitPicker label="Barrier" value={barrier} onChange={setBarrier} />}

      <div className="mb-2 mt-2 flex items-center justify-between text-sm">
        <span className="text-muted">Last Session</span>
        <span>0 trades (0W / 0L)</span>
      </div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted">Session P/L:</span>
        <span className="font-semibold text-teal">+0.00 USD</span>
      </div>

      {mode === 'auto' && (
        <p className="mb-3 text-center text-[11px] text-muted">Auto stake progression active (max 8 steps)</p>
      )}
      {mode === 'manual' && (
        <p className="mb-3 text-center text-[11px] text-muted">Manual mode settles one contract per click</p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {group === 'even_odd' && (
          <>
            <OutcomeButton
              icon={<EvenIcon />}
              label="Even"
              stake={stake}
              payoutPct={evenOdd.even}
              onClick={() => trade('Even', evenOdd.even)}
              showBar
            />
            <OutcomeButton
              icon={<OddIcon />}
              label="Odd"
              stake={stake}
              payoutPct={evenOdd.odd}
              onClick={() => trade('Odd', evenOdd.odd)}
              danger
              showBar
            />
          </>
        )}
        {group === 'matches_differs' && (
          <>
            <OutcomeButton
              icon={<Target size={15} />}
              label="Match"
              stake={stake}
              payoutPct={matchesDiffers.match}
              onClick={() => trade(`Match ${pickedDigit}`, matchesDiffers.match)}
            />
            <OutcomeButton
              icon={<CircleSlash size={15} />}
              label="Differs"
              stake={stake}
              payoutPct={matchesDiffers.differs}
              onClick={() => trade(`Differs ${pickedDigit}`, matchesDiffers.differs)}
              danger
            />
          </>
        )}
        {group === 'over_under' && (
          <>
            <OutcomeButton
              icon={<ArrowUp size={15} />}
              label="Over"
              stake={stake}
              payoutPct={overUnder.over}
              onClick={() => trade(`Over ${barrier}`, overUnder.over)}
            />
            <OutcomeButton
              icon={<ArrowDown size={15} />}
              label="Under"
              stake={stake}
              payoutPct={overUnder.under}
              onClick={() => trade(`Under ${barrier}`, overUnder.under)}
              danger
            />
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted">
          Balance:
          <br />
          <span className="text-sm text-text">${balance.toFixed(2)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          {dateStr} {timeStr}
        </span>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-muted hover:text-text"
        >
          <Expand size={13} />
        </button>
      </div>
    </div>
  )
}

function NumberBox({
  icon,
  label,
  value,
  onChange,
  prefix,
  color,
}: {
  icon: ReactNode
  label: string
  value: number
  onChange: (v: number) => void
  prefix: string
  color: string
}) {
  return (
    <label className="flex flex-col gap-1.5 rounded-lg border border-line px-2.5 py-2">
      <span className={`flex items-center gap-1 text-[10px] font-semibold leading-tight ${color}`}>
        {icon}
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className={`text-xs ${color}`}>{prefix}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full bg-transparent text-lg font-bold outline-none ${color}`}
        />
      </span>
    </label>
  )
}

function DigitPicker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="mb-3">
      <p className="mb-2 text-center text-xs text-muted">{label}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`rounded-md border py-1.5 text-sm font-semibold transition-colors ${
              d === value ? 'border-teal bg-teal/10 text-teal' : 'border-line text-muted hover:text-text'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

function OutcomeButton({
  icon,
  label,
  stake,
  payoutPct,
  onClick,
  danger,
  showBar,
}: {
  icon: ReactNode
  label: string
  stake: number
  payoutPct: number
  onClick: () => void
  danger?: boolean
  showBar?: boolean
}) {
  const payoutUsd = stake * (1 + payoutPct / 100)
  const barPct = Math.min(100, payoutPct)
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        danger
          ? 'border-red/40 bg-gradient-to-br from-red/10 to-transparent hover:from-red/15'
          : 'border-teal/40 bg-gradient-to-br from-teal/10 to-transparent hover:from-teal/15'
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
        <span className={`shrink-0 ${danger ? 'text-red' : 'text-teal'}`}>{icon}</span>
        <span className="shrink-0">{label}</span>
        {showBar && (
          <span className="ml-1 h-1.5 w-full max-w-[110px] shrink overflow-hidden rounded-full bg-line/60">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-teal/40 to-teal"
              style={{ width: `${barPct}%` }}
            />
          </span>
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[10px] text-muted">Payout {payoutUsd.toFixed(2)} USD</span>
        <span className={`block text-sm font-bold ${danger ? 'text-red' : 'text-teal'}`}>{payoutPct.toFixed(2)}%</span>
      </span>
    </button>
  )
}
