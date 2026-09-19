import { CheckCircle2, Clock, X, XCircle } from 'lucide-react'
import type { Position } from '../../types'

export function PositionDetailModal({
  position,
  onClose,
}: {
  position: Position
  onClose: () => void
}) {
  const isWon = position.status === 'won'
  const isLost = position.status === 'lost'
  const isOpen = position.status === 'open'

  const openTime = new Date(position.openedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const closeTime = position.closedAt
    ? new Date(position.closedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Pending'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isWon ? 'bg-teal/20 text-teal' : isLost ? 'bg-red/20 text-red' : 'bg-line text-muted'
              }`}
            >
              {isWon && <CheckCircle2 size={18} />}
              {isLost && <XCircle size={18} />}
              {isOpen && <Clock size={18} />}
            </span>
            <div>
              <h3 className="text-base font-bold">Contract Receipt</h3>
              <p className="text-xs text-muted font-mono">{position.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="my-5 rounded-xl border border-line bg-panel-light p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted">Resulting Profit / Loss</p>
          <p
            className={`mt-1 text-3xl font-extrabold ${
              isWon ? 'text-teal' : isLost ? 'text-red' : 'text-text'
            }`}
          >
            {isOpen
              ? 'Contract Running...'
              : (position.profit ?? 0) >= 0
                ? `+$${position.profit?.toFixed(2)} USD`
                : `-$${Math.abs(position.profit ?? 0).toFixed(2)} USD`}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold uppercase ${
              isWon
                ? 'bg-teal/20 text-teal'
                : isLost
                  ? 'bg-red/20 text-red'
                  : 'bg-amber-400/20 text-amber-400'
            }`}
          >
            {position.status}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-line/60 pb-2">
            <span className="text-muted">Market / Symbol</span>
            <span className="font-semibold">{position.symbol}</span>
          </div>

          <div className="flex justify-between border-b border-line/60 pb-2">
            <span className="text-muted">Contract Type</span>
            <span className="font-semibold">{position.contract}</span>
          </div>

          <div className="flex justify-between border-b border-line/60 pb-2">
            <span className="text-muted">Account Type</span>
            <span className="capitalize font-semibold text-teal">{position.balanceType} Account</span>
          </div>

          <div className="flex justify-between border-b border-line/60 pb-2">
            <span className="text-muted">Stake</span>
            <span className="font-semibold">${position.stake.toFixed(2)} USD</span>
          </div>

          <div className="flex justify-between border-b border-line/60 pb-2">
            <span className="text-muted">Potential Payout</span>
            <span className="font-semibold">${position.payout.toFixed(2)} USD ({position.payoutPct.toFixed(1)}%)</span>
          </div>

          {position.entrySpot && (
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-muted">Entry Spot Price</span>
              <span className="font-mono font-semibold">{position.entrySpot.toFixed(2)}</span>
            </div>
          )}

          {position.exitSpot && (
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-muted">Exit Spot Price</span>
              <span className="font-mono font-semibold">{position.exitSpot.toFixed(2)}</span>
            </div>
          )}

          {position.exitDigit !== undefined && (
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-muted">Settlement Last Digit</span>
              <span className="font-mono font-bold text-amber-400 text-base">{position.exitDigit}</span>
            </div>
          )}

          <div className="flex justify-between pt-1">
            <span className="text-muted">Execution Timestamps</span>
            <span className="text-xs text-muted">
              {openTime} → {closeTime}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-panel-light py-2.5 text-sm font-semibold hover:bg-line/60"
        >
          Close Receipt
        </button>
      </div>
    </div>
  )
}
