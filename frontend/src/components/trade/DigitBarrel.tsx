import type { DigitStat } from '../../types'

export function DigitBarrel({ stats, lastDigit }: { stats: DigitStat[]; lastDigit?: number }) {
  const max = Math.max(...stats.map((s) => s.pct))
  const min = Math.min(...stats.map((s) => s.pct))

  return (
    <div className="flex items-start justify-center gap-2 overflow-x-auto px-2 pb-1 sm:gap-3 sm:px-4">
      {stats.map((s) => {
        const isMax = s.pct === max
        const isMin = s.pct === min
        const isLast = s.digit === lastDigit
        return (
          <div key={s.digit} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full border text-[11px] font-semibold leading-tight transition-colors sm:h-11 sm:w-11 sm:text-xs ${
                isMax ? 'border-teal text-teal' : isMin ? 'border-line text-red' : 'border-line text-text'
              }`}
            >
              <span>{s.digit}</span>
              <span className="text-[8px] font-normal text-muted sm:text-[10px]">{s.pct.toFixed(1)}%</span>
            </div>
            <span
              className="h-0 w-0 border-x-4 border-b-4 border-x-transparent border-b-amber-400"
              style={{ visibility: isLast ? 'visible' : 'hidden' }}
            />
          </div>
        )
      })}
    </div>
  )
}
