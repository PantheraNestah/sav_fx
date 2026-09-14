import { Download, LineChart as LineChartIcon, PenLine, SlidersHorizontal, Target } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { usePriceFeed } from '../../hooks/usePriceFeed'
import type { Symbol } from '../../types'
import { DigitBarrel } from './DigitBarrel'
import { SymbolSelector } from './SymbolSelector'

export function ChartPanel({
  symbol,
  onSymbolChange,
}: {
  symbol: Symbol
  onSymbolChange: (s: Symbol) => void
}) {
  const { ticks, digitStats, lastDigit, price, change, changePct } = usePriceFeed(symbol.id)

  const prices = ticks.map((t) => t.price)
  const min = prices.length ? Math.min(...prices) - 4 : price - 4
  const max = prices.length ? Math.max(...prices) + 4 : price + 4
  const pricePct = max > min ? ((price - min) / (max - min)) * 100 : 50
  const tagTop = Math.min(92, Math.max(4, 100 - pricePct))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line p-3">
        <div className="min-w-0 flex-1">
          <SymbolSelector symbol={symbol} onChange={onSymbolChange} price={price} change={change} changePct={changePct} />
        </div>
        <div className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted">100%</div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-teal bg-teal/15 text-[11px] font-bold text-teal">
            1T
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-text">
            <LineChartIcon size={15} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-text">
            <SlidersHorizontal size={15} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-text">
            <PenLine size={15} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-text">
            <Download size={15} />
          </button>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ticks} margin={{ top: 20, right: 56, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4fd1c5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4fd1c5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis
              domain={['dataMin - 4', 'dataMax + 4']}
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={56}
              tick={{ fill: '#8ca0b8', fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#eaf2fb"
              strokeWidth={1.5}
              fill="url(#priceFill)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {ticks.length > 0 && (
          <div
            className="pointer-events-none absolute right-9 -translate-y-1/2 rounded-md border border-teal bg-panel px-2 py-1 text-xs font-semibold tabular-nums text-teal shadow"
            style={{ top: `${tagTop}%` }}
          >
            {price.toFixed(2)}
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
          <button className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel text-muted hover:text-text">
            <span className="text-sm leading-none">+</span>
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel text-teal">
            <Target size={14} />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel text-muted hover:text-text">
            <span className="text-sm leading-none">−</span>
          </button>
        </div>
      </div>

      <div className="border-t border-line py-2">
        <DigitBarrel stats={digitStats} lastDigit={lastDigit} />
      </div>
    </div>
  )
}
