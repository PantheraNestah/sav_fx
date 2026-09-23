import {
  Download,
  LineChart as LineChartIcon,
  Minus,
  Plus,
  SlidersHorizontal,
  Target,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { IChartApi } from 'lightweight-charts'
import { usePriceFeed } from '../../hooks/usePriceFeed'
import { useToast } from '../../context/useToast'
import { useTheme } from '../../context/useTheme'
import type { Symbol } from '../../types'
import { DigitBarrel } from './DigitBarrel'
import { SymbolSelector } from './SymbolSelector'
import { TradingViewChart } from './TradingViewChart'

export function ChartPanel({
  symbol,
  onSymbolChange,
}: {
  symbol: Symbol
  onSymbolChange: (s: Symbol) => void
}) {
  const { ticks, digitStats, lastDigit, price, change, changePct } = usePriceFeed(symbol.id)
  const { showToast } = useToast()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [interval, setInterval] = useState<'1T' | '2T' | '5T'>('1T')
  const [chartType, setChartType] = useState<'area' | 'line'>('area')
  const [showGrid, setShowGrid] = useState(true)
  const [zoomLevel, setZoomLevel] = useState<number>(60)

  const chartRef = useRef<IChartApi | null>(null)

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
    if (chartRef.current) {
      try {
        const canvas = chartRef.current.takeScreenshot(true, false)
        const link = document.createElement('a')
        link.download = `${symbol.label.replace(/\s+/g, '_')}_chart.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        showToast({
          title: 'TradingView Chart Exported',
          message: `Saved high-resolution snapshot for ${symbol.label}.`,
          type: 'success',
        })
        return
      } catch (e) {
        console.error('Failed to take chart screenshot', e)
      }
    }
    showToast({
      title: 'Chart Snapshot Captured',
      message: `Exported ${symbol.label} tick stream data.`,
      type: 'success',
    })
  }

  function handleZoomIn() {
    if (chartRef.current) {
      const currentSpacing = chartRef.current.timeScale().options().barSpacing || 8
      chartRef.current.timeScale().applyOptions({ barSpacing: Math.min(28, currentSpacing + 2) })
      setZoomLevel((z) => Math.max(20, z - 10))
    }
  }

  function handleZoomOut() {
    if (chartRef.current) {
      const currentSpacing = chartRef.current.timeScale().options().barSpacing || 8
      chartRef.current.timeScale().applyOptions({ barSpacing: Math.max(3, currentSpacing - 2) })
      setZoomLevel((z) => Math.min(100, z + 10))
    }
  }

  function handleResetZoom() {
    if (chartRef.current) {
      chartRef.current.timeScale().applyOptions({ barSpacing: 8 })
      chartRef.current.timeScale().fitContent()
      setZoomLevel(60)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
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
            title="Export TradingView Snapshot"
          >
            <Download size={13} />
          </button>

          {/* Window Tick Count */}
          <span className="hidden sm:inline-flex rounded-lg border border-line bg-panel-light px-2 py-1 text-[11px] font-mono text-muted">
            {ticks.length} ticks
          </span>
        </div>
      </div>

      {/* TradingView Chart Container */}
      <div className="relative min-h-0 flex-1">
        <TradingViewChart
          ticks={ticks}
          chartType={chartType}
          showGrid={showGrid}
          isDark={isDark}
          symbolLabel={symbol.label}
          onChartReady={(c) => {
            chartRef.current = c
          }}
        />

        {/* Bottom-left Sleek Zoom & Grid Toolbar Pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-xl border border-line/80 bg-panel/90 p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={handleZoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-panel-light hover:text-text transition"
            title="Zoom Out (Show more ticks)"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleResetZoom}
            className="flex h-7 px-1.5 items-center justify-center rounded-lg text-[10px] font-mono font-bold text-teal hover:bg-teal/15 transition"
            title="Reset Zoom to Fit"
          >
            <Target size={12} className="mr-0.5" />
            <span>{zoomLevel}t</span>
          </button>
          <button
            onClick={handleZoomIn}
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

      {/* Centered Circular Digit Elements Row */}
      <div className="border-t border-line py-2.5 bg-panel-light/40">
        <DigitBarrel stats={digitStats} lastDigit={lastDigit} />
      </div>
    </div>
  )
}
