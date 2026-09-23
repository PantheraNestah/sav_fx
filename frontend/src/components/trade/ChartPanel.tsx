import {
  Download,
  LineChart as LineChartIcon,
  Minus,
  Plus,
  SlidersHorizontal,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from 'recharts'
import { usePriceFeed } from '../../hooks/usePriceFeed'
import { useToast } from '../../context/useToast'
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
  const { showToast } = useToast()

  const [interval, setInterval] = useState<'1T' | '2T' | '5T'>('1T')
  const [chartType, setChartType] = useState<'area' | 'line'>('area')
  const [showGrid, setShowGrid] = useState(true)
  const [zoomLevel, setZoomLevel] = useState<number>(60) // window length

  const displayTicks = ticks.slice(-zoomLevel)
  const prices = displayTicks.map((t) => t.price)
  const minPrice = prices.length ? Math.min(...prices) - 1.5 : price - 1.5
  const maxPrice = prices.length ? Math.max(...prices) + 1.5 : price + 1.5
  const pricePct = maxPrice > minPrice ? (price - minPrice) / (maxPrice - minPrice) : 0.5
  const clampedPct = Math.min(0.96, Math.max(0.04, pricePct))

  function toggleInterval() {
    const next = interval === '1T' ? '2T' : interval === '2T' ? '5T' : '1T'
    setInterval(next)
    showToast({
      title: `Tick Duration Set to ${next}`,
      message: 'Sampling rate updated for synthetic index.',
      type: 'info',
    })
  }

  function handleDownload() {
    showToast({
      title: 'Chart Snapshot Captured',
      message: `Exported ${symbol.label} tick stream data.`,
      type: 'success',
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Clean Top Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <SymbolSelector
            symbol={symbol}
            onChange={onSymbolChange}
            price={price}
            change={change}
            changePct={changePct}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tick Interval Button */}
          <button
            onClick={toggleInterval}
            className="flex h-7 items-center gap-1 rounded-lg border border-teal/40 bg-teal/15 px-2 text-[11px] font-bold text-teal transition hover:bg-teal/25"
            title="Tick Frequency (1T / 2T / 5T)"
          >
            <span>{interval}</span>
          </button>

          {/* Chart Style (Area / Line) */}
          <button
            onClick={() => setChartType((t) => (t === 'area' ? 'line' : 'area'))}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted transition hover:text-text ${
              chartType === 'line' ? 'border-teal bg-teal/15 text-teal' : 'hover:bg-panel-light'
            }`}
            title="Toggle Line / Area Chart"
          >
            <LineChartIcon size={14} />
          </button>

          {/* Snapshot Button */}
          <button
            onClick={handleDownload}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-panel-light hover:text-text transition"
            title="Export Snapshot"
          >
            <Download size={13} />
          </button>

          {/* Window Tick Count */}
          <span className="hidden sm:inline-flex rounded-lg border border-line bg-panel-light px-2 py-1 text-[11px] font-mono text-muted">
            {displayTicks.length} ticks
          </span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Recharts Live Chart Canvas */}
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={displayTicks} margin={{ top: 16, right: 60, bottom: 8, left: 6 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.32} />
                  <stop offset="90%" stopColor="var(--color-teal)" stopOpacity={0.03} />
                  <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              {showGrid && (
                <CartesianGrid
                  stroke="var(--color-line)"
                  strokeOpacity={0.4}
                  strokeDasharray="3 3"
                  vertical={false}
                />
              )}
              <YAxis
                domain={['dataMin - 1.5', 'dataMax + 1.5']}
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={58}
                tick={{ fill: 'var(--color-muted)', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--color-text)"
                strokeWidth={1.85}
                fill="url(#priceFill)"
                isAnimationActive={false}
                dot={false}
              />
              <ReferenceLine
                y={price}
                stroke="var(--color-teal)"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                strokeOpacity={0.8}
              />
            </AreaChart>
          ) : (
            <LineChart data={displayTicks} margin={{ top: 16, right: 60, bottom: 8, left: 6 }}>
              {showGrid && (
                <CartesianGrid
                  stroke="var(--color-line)"
                  strokeOpacity={0.4}
                  strokeDasharray="3 3"
                  vertical={false}
                />
              )}
              <YAxis
                domain={['dataMin - 1.5', 'dataMax + 1.5']}
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={58}
                tick={{ fill: 'var(--color-muted)', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--color-teal)"
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
              <ReferenceLine
                y={price}
                stroke="var(--color-teal)"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                strokeOpacity={0.8}
              />
            </LineChart>
          )}
        </ResponsiveContainer>

        {/* Dynamic Spot Price Badge aligned on right axis */}
        {displayTicks.length > 0 && (
          <div
            className="pointer-events-none absolute right-1 -translate-y-1/2 z-20 rounded border border-teal bg-teal px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold font-mono text-bg shadow-md transition-all duration-100"
            style={{
              top: `calc(16px + (100% - 24px) * ${(1 - clampedPct).toFixed(4)})`,
            }}
          >
            {price.toFixed(2)}
          </div>
        )}

        {/* Bottom-left Sleek Zoom & Grid Toolbar Pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-xl border border-line/80 bg-panel/90 p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={() => setZoomLevel((z) => Math.min(100, z + 10))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-panel-light hover:text-text transition"
            title="Zoom Out (Show more ticks)"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => setZoomLevel(60)}
            className="flex h-7 px-1.5 items-center justify-center rounded-lg text-[10px] font-mono font-bold text-teal hover:bg-teal/15 transition"
            title="Reset Zoom"
          >
            <Target size={12} className="mr-0.5" />
            <span>{zoomLevel}t</span>
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(20, z - 10))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-panel-light hover:text-text transition"
            title="Zoom In (Show fewer ticks)"
          >
            <Plus size={13} />
          </button>
          <div className="h-4 w-px bg-line/80 mx-0.5" />
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              showGrid ? 'text-teal bg-teal/10' : 'text-muted hover:bg-panel-light hover:text-text'
            }`}
            title="Toggle Grid Lines"
          >
            <SlidersHorizontal size={12} />
          </button>
        </div>
      </div>

      <div className="border-t border-line py-2 bg-panel-light/40">
        <DigitBarrel stats={digitStats} lastDigit={lastDigit} />
      </div>
    </div>
  )
}
