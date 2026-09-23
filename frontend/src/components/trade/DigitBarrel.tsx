import type { DigitStat } from '../../types'

export function DigitBarrel({ stats, lastDigit }: { stats: DigitStat[]; lastDigit?: number }) {
  const max = Math.max(...stats.map((s) => s.pct))
  const min = Math.min(...stats.map((s) => s.pct))

  return (
    <div className="w-full max-w-full overflow-hidden py-1 px-1 sm:px-4">
      <div className="flex w-full items-center justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3">
        {stats.map((s) => {
          const isMax = s.pct === max
          const isMin = s.pct === min
          const isLast = s.digit === lastDigit
          return (
            <div key={s.digit} className="flex flex-col items-center gap-0.5">
              <div
                className={`flex h-[28px] w-[28px] xs:h-[30px] xs:w-[30px] sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 flex-col items-center justify-center rounded-full border transition-all ${
                  isMax
                    ? 'border-teal bg-teal/15 text-teal font-bold shadow-sm'
                    : isMin
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 font-semibold'
                    : 'border-line bg-panel text-text'
                }`}
              >
                <span className="text-[10px] xs:text-[11px] sm:text-xs font-bold leading-none">{s.digit}</span>
                <span className="text-[6.5px] xs:text-[7.5px] sm:text-[9px] font-normal text-muted leading-none tracking-tight">
                  {s.pct.toFixed(1)}%
                </span>
              </div>
              <span
                className="h-0 w-0 border-x-[3px] border-b-[4px] border-x-transparent border-b-amber-400"
                style={{ visibility: isLast ? 'visible' : 'hidden' }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
