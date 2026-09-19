import { HelpCircle, X } from 'lucide-react'

export function TradeExplainerModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/20 text-teal">
              <HelpCircle size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold">Trade Types Explained</h3>
              <p className="text-xs text-muted">Fixed-odds contract mechanics and settlement rules</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="my-5 space-y-4 text-sm">
          <div className="rounded-xl border border-line bg-panel-light p-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-bold text-teal">1. Even / Odd Contracts</h4>
              <span className="text-xs font-mono font-semibold text-muted">Payout: ~90.6%</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Predict whether the <strong>last decimal digit</strong> of the next tick spot price will be Even (0, 2, 4, 6, 8) or Odd (1, 3, 5, 7, 9). With a 50% baseline theoretical probability, the platform pays 90.6% after the 4.7% house edge.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-panel-light p-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-bold text-teal">2. Matches / Differs Contracts</h4>
              <span className="text-xs font-mono font-semibold text-muted">Payout: ~857% (Match) / 10.6% (Differs)</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Select a target digit between 0 and 9. If you predict <strong>Match</strong>, you win if the last digit equals your pick (10% probability, paying ~8.5x). If you predict <strong>Differs</strong>, you win if the last digit is anything else (90% probability, paying 10.59%).
            </p>
          </div>

          <div className="rounded-xl border border-line bg-panel-light p-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-bold text-teal">3. Over / Under Contracts</h4>
              <span className="text-xs font-mono font-semibold text-muted">Payout: Variable</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Set a barrier digit (0–9). If you predict <strong>Over</strong>, the last digit must be strictly greater than your barrier. If you predict <strong>Under</strong>, the last digit must be strictly less than the barrier. Payouts adapt dynamically to barrier probability.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-panel-light p-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-bold text-amber-400">4. Auto-Trading Mode</h4>
              <span className="text-xs font-mono font-semibold text-muted">Martingale Engine</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Auto mode continues placing contracts until your <strong>Target Profit</strong> or <strong>Target Loss</strong> is triggered. On consecutive losses, stake multiplies by your <em>Loss Multiple</em> up to 8 steps to recover drawdown upon the next win.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-teal py-2.5 text-sm font-semibold text-bg hover:brightness-110"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
