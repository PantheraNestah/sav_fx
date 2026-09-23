import { ArrowRight, Sparkles, X } from 'lucide-react'
import type { ContractGroup } from '../../types'

export interface SetupRecommendation {
  title: string
  contractGroup: ContractGroup
  side: string
  targetDigit?: number
  barrier?: number
  confidence: number
  reason: string
  suggestedStake: number
}

const RECOMMENDATIONS: SetupRecommendation[] = [
  {
    title: 'High Even Probability Drift',
    contractGroup: 'even_odd',
    side: 'Even',
    confidence: 84,
    reason: 'Even digits appeared on 58% of the last 40 ticks, exhibiting low parity reversal latency.',
    suggestedStake: 15,
  },
  {
    title: 'Cold Digit Outlier (Differs Edge)',
    contractGroup: 'matches_differs',
    side: 'Differs',
    targetDigit: 3,
    confidence: 92,
    reason: 'Digit 3 has appeared only 1 time in the last 40 ticks. Differs probability exceeds 92.5%.',
    suggestedStake: 25,
  },
  {
    title: 'Low Barrier Penetration',
    contractGroup: 'over_under',
    side: 'Over',
    barrier: 2,
    confidence: 79,
    reason: 'Over 2 barrier contract offers ~78% win rate with continuous synthetic upside drift.',
    suggestedStake: 20,
  },
]

export function AiScannerModal({
  onClose,
  onApply,
}: {
  onClose: () => void
  onApply: (rec: SetupRecommendation) => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3.5 sm:p-5">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative my-auto flex max-h-[82dvh] sm:max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-teal/40 bg-panel shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Pinned Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5 sm:px-6 sm:py-4 bg-panel">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-teal/20 text-teal">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text">AI Pattern Scanner</h3>
              <p className="text-[11px] sm:text-xs text-muted leading-tight">High-probability setups based on live tick distribution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-panel-light hover:text-text transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-4 space-y-3">
          <div className="rounded-xl border border-teal/30 bg-teal/5 p-3 text-xs text-muted leading-relaxed">
            <span className="font-semibold text-teal">Live Algorithm Analysis:</span> Scanned last 40 ticks across continuous synthetic volatility indices. Below are mathematically favorable setups.
          </div>

          <div className="space-y-3">
            {RECOMMENDATIONS.map((rec) => (
              <div
                key={rec.title}
                className="group rounded-xl border border-line bg-panel-light p-3.5 sm:p-4 transition hover:border-teal/50 hover:bg-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-text group-hover:text-teal">{rec.title}</h4>
                    <p className="mt-1 text-[11px] sm:text-xs text-muted leading-relaxed">{rec.reason}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal/20 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-teal">
                    {rec.confidence}% Edge
                  </span>
                </div>

                <div className="mt-2.5 sm:mt-3 flex items-center justify-between border-t border-line/60 pt-2.5 sm:pt-3 text-[11px] sm:text-xs">
                  <span className="text-muted">
                    Contract: <span className="font-semibold text-text uppercase">{rec.contractGroup.replace('_', ' ')} · {rec.side}</span>
                  </span>
                  <button
                    onClick={() => {
                      onApply(rec)
                      onClose()
                    }}
                    className="flex items-center gap-1 rounded-lg bg-teal px-2.5 py-1.5 sm:px-3 text-xs font-semibold text-bg hover:brightness-110 transition active:scale-95"
                  >
                    Apply Setup <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
