import {
  Download,
  LineChart as LineChartIcon,
  Minus,
  Plus,
  SlidersHorizontal,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
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
  const min = prices.length ? Math.min(...prices) - 2 : price - 2
  const max = prices.length ? Math.max(...prices) + 2 : price + 2
  const pricePct = max > min ? ((price - min) / (max - min)) * 100 : 50
  const tagTop = Math.min(90, Math.max(8, 100 - pricePct))

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
      <div className="flex items-center justify-between gap-3 border-b border-line p-3">
        <div className="min-w-0 max-w-full">
          <SymbolSelector
            symbol={symbol}
            onChange={onSymbolChange}
            price={price}
            change={change}
            changePct={changePct}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-line bg-panel-light px-2 py-1 text-xs font-mono text-muted">
            Window: {displayTicks.length} ticks
          </span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Left Toolbar Controls */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          <button
            onClick={toggleInterval}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal bg-teal/15 text-[11px] font-bold text-teal transition hover:scale-105"
            title="Tick Frequency"
          >
            {interval}
          </button>
          <button
            onClick={() => setChartType((t) => (t === 'area' ? 'line' : 'area'))}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line transition ${
              chartType === 'line' ? 'border-teal bg-teal/15 text-teal' : 'text-muted hover:text-text'
            }`}
            title="Toggle Line / Area Chart"
          >
            <LineChartIcon size={15} />
          </button>
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line transition ${
              showGrid ? 'border-teal bg-teal/15 text-teal' : 'text-muted hover:text-text'
            }`}
            title="Toggle Grid Lines"
          >
            <SlidersHorizontal size={15} />
          </button>
          <button
            onClick={handleDownload}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-text"
            title="Export Snapshot"
          >
            <Download size={15} />
          </button>
        </div>

        {/* Recharts Live Chart Canvas */}
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={displayTicks} margin={{ top: 20, right: 56, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              {showGrid && <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.5} vertical={false} />}
              <YAxis
                domain={['dataMin - 2', 'dataMax + 2']}
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={56}
                tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--color-text)"
                strokeWidth={1.75}
                fill="url(#priceFill)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          ) : (
            <LineChart data={displayTicks} margin={{ top: 20, right: 56, bottom: 8, left: 0 }}>
              {showGrid && <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.5} vertical={false} />}
              <YAxis
                domain={['dataMin - 2', 'dataMax + 2']}
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={56}
                tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
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
            </LineChart>
          )}
        </ResponsiveContainer>

        {/* Dynamic Spot Price Badge */}
        {displayTicks.length > 0 && (
          <div
            className="pointer-events-none absolute right-9 -translate-y-1/2 rounded-lg border border-teal bg-panel px-2.5 py-1 text-xs font-bold tabular-nums text-teal shadow-lg transition-all"
            style={{ top: `${tagTop}%` }}
          >
            {price.toFixed(2)}
          </div>
        )}

        {/* Bottom-left Zoom Controls */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.max(20, z - 10))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-muted hover:text-text"
            title="Zoom In"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => setZoomLevel(60)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-teal"
            title="Reset Center"
          >
            <Target size={13} />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.min(100, z + 10))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-muted hover:text-text"
            title="Zoom Out"
          >
            <Minus size={13} />
          </button>
        </div>
      </div>

      <div className="border-t border-line py-2 bg-panel-light/40">
        <DigitBarrel stats={digitStats} lastDigit={lastDigit} />
      </div>
    </div>
  )
}
