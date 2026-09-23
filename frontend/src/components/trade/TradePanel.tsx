import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CircleSlash,
  Expand,
  Info,
  Minus,
  Plus,
  Shrink,
  Sparkles,
  Square,
  Target,
  TrendingDown,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAccount } from '../../context/useAccount'
import { evenOddPayout, matchesDiffersPayout, overUnderPayout } from '../../lib/payouts'
import type { ContractGroup, StakeMode, Symbol, TradeMode } from '../../types'
import { AiScannerModal, type SetupRecommendation } from '../modals/AiScannerModal'
import { TradeExplainerModal } from '../modals/TradeExplainerModal'

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
  const {
    balances,
    balanceType,
    placeTrade,
    sessionStats,
    autoSession,
    startAutoSession,
    stopAutoSession,
  } = useAccount()

  const [group, setGroup] = useState<ContractGroup>('even_odd')
  const [mode, setMode] = useState<TradeMode>('manual')
  const [stakeMode, setStakeMode] = useState<StakeMode>('stake')

  // Numerical inputs
  const [stakeInput, setStakeInput] = useState<number>(10)
  const [payoutInput, setPayoutInput] = useState<number>(19.06)
  const [targetProfit, setTargetProfit] = useState<number>(100)
  const [targetLoss, setTargetLoss] = useState<number>(250)
  const [lossMultiple, setLossMultiple] = useState<number>(2)
  const [pickedDigit, setPickedDigit] = useState<number>(5)
  const [barrier, setBarrier] = useState<number>(5)

  // Local modals
  const [fullscreen, setFullscreen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [explainerOpen, setExplainerOpen] = useState(false)

  const now = useClock()
  const balance = balances[balanceType]

  // Compute payouts
  const evenOdd = useMemo(() => evenOddPayout(), [])
  const matchesDiffers = useMemo(() => matchesDiffersPayout(pickedDigit), [pickedDigit])
  const overUnder = useMemo(() => overUnderPayout(barrier), [barrier])

  // Get current active payout percentage based on group
  const activePayoutPct = useMemo(() => {
    if (group === 'even_odd') return evenOdd.even
    if (group === 'matches_differs') return matchesDiffers.differs
    return overUnder.over
  }, [group, evenOdd, matchesDiffers, overUnder])

  // Effective stake calculation based on StakeMode
  const effectiveStake = useMemo(() => {
    if (stakeMode === 'stake') {
      return Math.max(1, stakeInput)
    }
    // If payout mode: stake = payout / (1 + payoutPct / 100)
    const factor = 1 + activePayoutPct / 100
    return Math.max(1, Number((payoutInput / factor).toFixed(2)))
  }, [stakeMode, stakeInput, payoutInput, activePayoutPct])

  function handleStakeChange(newStake: number) {
    const val = Math.max(1, newStake)
    setStakeInput(val)
    setPayoutInput(Number((val * (1 + activePayoutPct / 100)).toFixed(2)))
  }

  function handlePayoutChange(newPayout: number) {
    const val = Math.max(1, newPayout)
    setPayoutInput(val)
    const calculatedStake = Number((val / (1 + activePayoutPct / 100)).toFixed(2))
    setStakeInput(Math.max(1, calculatedStake))
  }

  function executeTrade(side: string, payoutPct: number) {
    if (effectiveStake <= 0 || effectiveStake > balance) return

    if (mode === 'auto') {
      startAutoSession({
        baseStake: effectiveStake,
        lossMultiple,
        targetProfit,
        targetLoss,
        contractGroup: group,
        side,
        symbol: symbol.label,
        payoutPct,
        targetDigit: group === 'matches_differs' ? pickedDigit : undefined,
        barrier: group === 'over_under' ? barrier : undefined,
      })
    } else {
      placeTrade({
        contract: `${GROUPS.find((g) => g.id === group)?.label} · ${side}`,
        symbol: symbol.label,
        stake: effectiveStake,
        payoutPct,
        contractGroup: group,
        side,
        targetDigit: group === 'matches_differs' ? pickedDigit : undefined,
        barrier: group === 'over_under' ? barrier : undefined,
      })
    }
  }

  function handleApplyRecommendation(rec: SetupRecommendation) {
    setGroup(rec.contractGroup)
    if (rec.targetDigit !== undefined) setPickedDigit(rec.targetDigit)
    if (rec.barrier !== undefined) setBarrier(rec.barrier)
    handleStakeChange(rec.suggestedStake)
  }

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false })
  const isInsufficient = effectiveStake > balance

  return (
    <div
      className={`flex flex-col p-3.5 xl:h-full xl:min-h-0 xl:overflow-y-auto ${
        fullscreen ? 'fixed inset-0 z-50 overflow-y-auto bg-bg p-6' : ''
      }`}
    >
      {fullscreen && (
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <span className="font-bold text-lg">Trade View — Fullscreen</span>
          <button
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:border-teal"
          >
            <Shrink size={14} /> Exit Fullscreen
          </button>
        </div>
      )}

      {/* Contract Explainer Header Button */}
      <button
        onClick={() => setExplainerOpen(true)}
        className="mb-3 flex items-center gap-1.5 self-start text-xs text-muted hover:text-text transition"
      >
        <Info size={13} className="text-teal" />
        Learn about this trade type
      </button>

      {/* Contract Groups Toggle */}
      <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl bg-panel p-1 border border-line/60">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroup(g.id)}
            className={`rounded-lg py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
              group === g.id
                ? 'border border-teal bg-teal/15 text-teal shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Mode Switcher: Manual vs Auto */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Execution Mode</span>
        <span className="text-[11px] text-muted font-medium">
          {mode === 'auto' ? 'Automated Martingale' : 'Manual single click'}
        </span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-panel p-1 border border-line/60">
        {(['manual', 'auto'] as TradeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              if (autoSession.isActive) stopAutoSession()
              setMode(m)
            }}
            className={`rounded-lg py-1.5 text-sm font-semibold capitalize transition ${
              mode === m ? 'bg-panel-light text-text shadow' : 'text-muted hover:text-text'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Auto Mode Configuration Inputs */}
      {mode === 'auto' && (
        <div className="mb-4 space-y-2.5 rounded-xl border border-line bg-panel p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal">Auto Strategy Settings</span>
            {autoSession.isActive && (
              <span className="flex items-center gap-1 rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Running (Step {autoSession.step}/8)
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumberBox
              icon={<Target size={12} />}
              label="Target Profit"
              value={targetProfit}
              onChange={setTargetProfit}
              prefix="$"
              color="text-teal"
              disabled={autoSession.isActive}
            />
            <NumberBox
              icon={<AlertTriangle size={12} />}
              label="Target Loss"
              value={targetLoss}
              onChange={setTargetLoss}
              prefix="$"
              color="text-red"
              disabled={autoSession.isActive}
            />
            <NumberBox
              icon={<TrendingDown size={12} />}
              label="Loss Multiple"
              value={lossMultiple}
              onChange={setLossMultiple}
              prefix="x"
              color="text-amber-400"
              disabled={autoSession.isActive}
            />
          </div>

          {autoSession.isActive && (
            <div className="rounded-lg border border-teal/30 bg-teal/5 p-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Session Profit:</span>
                <span
                  className={`font-bold ${
                    autoSession.sessionProfit >= 0 ? 'text-teal' : 'text-red'
                  }`}
                >
                  {autoSession.sessionProfit >= 0 ? '+' : ''}${autoSession.sessionProfit.toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Trades / Step:</span>
                <span>
                  {autoSession.totalTrades} trades ({autoSession.wins}W / {autoSession.losses}L) · Step {autoSession.step}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stake Mode Toggle: Stake vs Payout */}
      <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-xl bg-panel p-1 border border-line/60">
        {(['stake', 'payout'] as StakeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setStakeMode(m)}
            className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
              stakeMode === m ? 'bg-panel-light text-text shadow' : 'text-muted hover:text-text'
            }`}
          >
            {m === 'stake' ? 'Set Stake Amount' : 'Set Desired Payout'}
          </button>
        ))}
      </div>

      {/* Primary Value Input (Stake or Payout) */}
      <div className="mb-2 flex items-center gap-1.5 xs:gap-2">
        <button
          onClick={() => {
            if (stakeMode === 'stake') handleStakeChange(stakeInput - 1)
            else handlePayoutChange(payoutInput - 2)
          }}
          className="flex h-10 w-9 xs:w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-muted hover:text-text transition"
        >
          <Minus size={15} />
        </button>

        <div
          className={`flex flex-1 min-w-[75px] items-center justify-between rounded-xl border px-2.5 xs:px-3 py-2 bg-panel transition ${
            isInsufficient ? 'border-red/60 bg-red/5' : 'border-line focus-within:border-teal'
          }`}
        >
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted truncate">
              {stakeMode === 'stake' ? 'Stake' : 'Target Payout'}
            </span>
            <input
              type="number"
              value={stakeMode === 'stake' ? stakeInput : payoutInput}
              onChange={(e) => {
                const val = Number(e.target.value)
                if (stakeMode === 'stake') handleStakeChange(val)
                else handlePayoutChange(val)
              }}
              className="w-full bg-transparent text-sm xs:text-base font-bold outline-none"
            />
          </div>
          <span className="text-[11px] xs:text-xs font-semibold text-muted ml-1.5 shrink-0">USD</span>
        </div>

        <button
          onClick={() => {
            if (stakeMode === 'stake') handleStakeChange(stakeInput + 1)
            else handlePayoutChange(payoutInput + 2)
          }}
          className="flex h-10 w-9 xs:w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-muted hover:text-text transition"
        >
          <Plus size={15} />
        </button>

        {/* AI Scanner Button */}
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-teal/40 bg-teal/10 px-2.5 xs:px-3 py-1.5 xs:py-2 text-teal hover:bg-teal/20 transition"
        >
          <span className="flex items-center gap-1 text-[11px] xs:text-xs font-bold whitespace-nowrap">
            <Sparkles size={12} className="xs:w-[13px] xs:h-[13px]" /> AI Scanner
          </span>
          <span className="text-[9px] text-teal/80 hidden xs:inline">Best setups</span>
        </button>
      </div>

      {/* Quick Amount Pills */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => handleStakeChange(effectiveStake + a)}
            className="rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-muted hover:border-teal/50 hover:text-text transition"
          >
            +{a}
          </button>
        ))}
        <button
          onClick={() => handleStakeChange(1)}
          className="rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-muted hover:border-teal/50 hover:text-text transition ml-auto"
        >
          Reset ($1)
        </button>
      </div>

      {/* Target Digit Picker for Matches / Differs */}
      {group === 'matches_differs' && (
        <DigitPicker label="Target Prediction Digit (0-9)" value={pickedDigit} onChange={setPickedDigit} />
      )}

      {/* Barrier Picker for Over / Under */}
      {group === 'over_under' && <DigitPicker label="Barrier Digit (0-9)" value={barrier} onChange={setBarrier} />}

      {/* Session Metrics Bar (Unified with AccountContext) */}
      <div className="mb-2 mt-1 rounded-xl border border-line/60 bg-panel-light p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted">Live Session:</span>
          <span className="font-semibold">
            {sessionStats.totalTrades} trades ({sessionStats.wins}W / {sessionStats.losses}L) · {sessionStats.winRate}% Win
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Session P/L:</span>
          <span
            className={`font-bold text-sm ${
              sessionStats.sessionPl >= 0 ? 'text-teal' : 'text-red'
            }`}
          >
            {sessionStats.sessionPl >= 0 ? '+' : ''}${sessionStats.sessionPl.toFixed(2)} USD
          </span>
        </div>
      </div>

      {/* Insufficient balance warning */}
      {isInsufficient && (
        <p className="mb-2 text-center text-xs font-semibold text-red">
          Stake (${effectiveStake.toFixed(2)}) exceeds {balanceType} balance (${balance.toFixed(2)})
        </p>
      )}

      {/* Outcome Execution Buttons */}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        {group === 'even_odd' && (
          <>
            <OutcomeButton
              icon={<EvenIcon />}
              label="Even"
              stake={effectiveStake}
              payoutPct={evenOdd.even}
              onClick={() => executeTrade('Even', evenOdd.even)}
              disabled={isInsufficient || (mode === 'auto' && autoSession.isActive)}
            />
            <OutcomeButton
              icon={<OddIcon />}
              label="Odd"
              stake={effectiveStake}
              payoutPct={evenOdd.odd}
              onClick={() => executeTrade('Odd', evenOdd.odd)}
              danger
              disabled={isInsufficient || (mode === 'auto' && autoSession.isActive)}
            />
          </>
        )}

        {group === 'matches_differs' && (
          <>
            <OutcomeButton
              icon={<Target size={15} />}
              label={`Match ${pickedDigit}`}
              stake={effectiveStake}
              payoutPct={matchesDiffers.match}
              onClick={() => executeTrade(`Match ${pickedDigit}`, matchesDiffers.match)}
              disabled={isInsufficient || (mode === 'auto' && autoSession.isActive)}
            />
            <OutcomeButton
              icon={<CircleSlash size={15} />}
              label={`Differs ${pickedDigit}`}
              stake={effectiveStake}
              payoutPct={matchesDiffers.differs}
              onClick={() => executeTrade(`Differs ${pickedDigit}`, matchesDiffers.differs)}
              danger
              disabled={isInsufficient || (mode === 'auto' && autoSession.isActive)}
            />
          </>
        )}

        {group === 'over_under' && (
          <>
            <OutcomeButton
              icon={<ArrowUp size={15} />}
              label={`Over ${barrier}`}
              stake={effectiveStake}
              payoutPct={overUnder.over}
              onClick={() => executeTrade(`Over ${barrier}`, overUnder.over)}
              disabled={isInsufficient || (mode === 'auto' && autoSession.isActive)}
            />
            <OutcomeButton
              icon={<ArrowDown size={15} />}
              label={`Under ${barrier}`}
              stake={effectiveStake}
              payoutPct={overUnder.under}
              onClick={() => executeTrade(`Under ${barrier}`, overUnder.under)}
              danger
              disabled={isInsufficient || (mode === 'auto' && autoSession.isActive)}
            />
          </>
        )}

        {/* Auto trading stop control button */}
        {mode === 'auto' && autoSession.isActive && (
          <button
            onClick={stopAutoSession}
            className="flex items-center justify-center gap-2 rounded-xl bg-red py-2.5 text-sm font-bold text-white hover:brightness-110 shadow-lg shadow-red/20"
          >
            <Square size={14} /> Stop Auto Session
          </button>
        )}
      </div>

      {/* Footer Info: Balance and Live Clock */}
      <div className="mt-3 flex items-center justify-between text-xs border-t border-line/60 pt-2.5">
        <span className="text-muted leading-tight">
          Balance: <span className="font-bold text-text">${balance.toFixed(2)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
          {dateStr} {timeStr}
        </span>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:text-text"
          title="Toggle Fullscreen"
        >
          <Expand size={13} />
        </button>
      </div>

      {/* Local Modals */}
      {scannerOpen && (
        <AiScannerModal onClose={() => setScannerOpen(false)} onApply={handleApplyRecommendation} />
      )}
      {explainerOpen && <TradeExplainerModal onClose={() => setExplainerOpen(false)} />}
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
  disabled,
}: {
  icon: ReactNode
  label: string
  value: number
  onChange: (v: number) => void
  prefix: string
  color: string
  disabled?: boolean
}) {
  return (
    <label
      className={`flex flex-col gap-1 rounded-xl border border-line bg-panel-light px-2.5 py-1.5 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <span className={`flex items-center gap-1 text-[10px] font-bold ${color} truncate`}>
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-baseline gap-1">
        <span className={`text-xs font-bold ${color}`}>{prefix}</span>
        <input
          type="number"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full bg-transparent text-sm font-extrabold outline-none ${color}`}
        />
      </span>
    </label>
  )
}

function DigitPicker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="mb-3 rounded-xl border border-line/60 bg-panel p-2.5">
      <p className="mb-2 text-center text-xs font-semibold text-muted">{label}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`rounded-lg border py-1.5 text-sm font-bold transition-all ${
              d === value
                ? 'border-teal bg-teal/20 text-teal shadow-sm scale-105'
                : 'border-line bg-panel-light text-muted hover:text-text'
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
  disabled,
}: {
  icon: ReactNode
  label: string
  stake: number
  payoutPct: number
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  const payoutUsd = stake * (1 + payoutPct / 100)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 items-center justify-between gap-2 xs:gap-3 rounded-xl border px-3 xs:px-4 py-2.5 xs:py-3 text-left transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-line bg-panel-light'
          : danger
            ? 'border-red/40 bg-gradient-to-br from-red/10 to-transparent hover:from-red/20 active:scale-[0.99]'
            : 'border-teal/40 bg-gradient-to-br from-teal/10 to-transparent hover:from-teal/20 active:scale-[0.99]'
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5 xs:gap-2 font-bold text-xs xs:text-sm">
        <span className={`shrink-0 ${danger ? 'text-red' : 'text-teal'}`}>{icon}</span>
        <span className="truncate">{label}</span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-[10px] xs:text-[11px] text-muted font-medium">
          Stake ${stake.toFixed(2)} → Return <span className="text-text font-bold">${payoutUsd.toFixed(2)}</span>
        </span>
        <span className={`block text-[11px] xs:text-xs font-extrabold ${danger ? 'text-red' : 'text-teal'}`}>
          +{payoutPct.toFixed(1)}% Payout
        </span>
      </span>
    </button>
  )
}
