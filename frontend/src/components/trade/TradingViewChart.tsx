import {
  AreaSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  LastPriceAnimationMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import type { Tick } from '../../types'

interface TradingViewChartProps {
  ticks: Tick[]
  chartType: 'area' | 'line'
  showGrid: boolean
  isDark: boolean
  symbolLabel: string
  onChartReady?: (chart: IChartApi) => void
}

interface Palette {
  bg: string
  text: string
  border: string
  grid: string
  accent: string
  areaTop: string
  areaBottom: string
  label: string
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Convert #rgb / #rrggbb to an rgba() string (canvas can't resolve var()/color-mix). */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n) || full.length !== 6) return hex
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/**
 * The chart is drawn on a canvas, which can't use CSS variables, so the palette is
 * resolved from the live theme tokens. This keeps the plot area identical to the
 * surrounding panel instead of a near-miss hard-coded shade.
 */
function readPalette(isDark: boolean): Palette {
  const bg = cssVar('--panel', isDark ? '#101d30' : '#ffffff')
  const accent = cssVar('--teal', isDark ? '#4fd1c5' : '#087f79')
  const line = cssVar('--line', isDark ? '#263d59' : '#cbdde7')
  return {
    bg,
    text: cssVar('--muted', isDark ? '#8ca0b8' : '#6f879a'),
    border: line,
    grid: withAlpha(line, isDark ? 0.45 : 0.7),
    accent,
    areaTop: withAlpha(accent, isDark ? 0.35 : 0.25),
    areaBottom: withAlpha(accent, 0.01),
    label: cssVar('--panel-light', isDark ? '#13243a' : '#eaf3f7'),
  }
}

export function TradingViewChart({
  ticks,
  chartType,
  showGrid,
  isDark,
  symbolLabel,
  onChartReady,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Line'> | null>(null)
  const onChartReadyRef = useRef(onChartReady)
  const ticksRef = useRef(ticks)
  const chartTypeRef = useRef(chartType)

  useEffect(() => {
    onChartReadyRef.current = onChartReady
    ticksRef.current = ticks
  })

  // 1. Create the chart once; theme/grid changes are applied in place below so the
  //    canvas is never torn down (a rebuild mid-theme-switch flashes the old colours
  //    on mobile and loses zoom/scroll state).
  useEffect(() => {
    if (!containerRef.current) return

    const p = readPalette(isDark)

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: p.bg },
        textColor: p.text,
        fontSize: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
      grid: {
        vertLines: { visible: showGrid, color: p.grid, style: LineStyle.Dotted },
        horzLines: { visible: showGrid, color: p.grid, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: p.accent, width: 1, style: LineStyle.Dashed, labelBackgroundColor: p.accent },
        horzLine: { color: p.accent, width: 1, style: LineStyle.Dashed, labelBackgroundColor: p.accent },
      },
      rightPriceScale: {
        borderColor: p.border,
        visible: true,
        autoScale: true,
        alignLabels: true,
        scaleMargins: {
          top: 0.12,
          bottom: 0.14,
        },
      },
      timeScale: {
        borderColor: p.border,
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 3,
        barSpacing: 8,
        minBarSpacing: 3,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart
    onChartReadyRef.current?.(chart)

    // Resize Observer for responsive canvas scaling
    const el = containerRef.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === el) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) chart.resize(width, height)
        }
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // Created once; later theme/grid changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Re-theme the live chart (and series) in place when the theme or grid changes
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const p = readPalette(isDark)
    chart.applyOptions({
      layout: { background: { type: ColorType.Solid, color: p.bg }, textColor: p.text },
      grid: {
        vertLines: { visible: showGrid, color: p.grid, style: LineStyle.Dotted },
        horzLines: { visible: showGrid, color: p.grid, style: LineStyle.Dotted },
      },
      crosshair: {
        vertLine: { color: p.accent, labelBackgroundColor: p.accent },
        horzLine: { color: p.accent, labelBackgroundColor: p.accent },
      },
      rightPriceScale: { borderColor: p.border },
      timeScale: { borderColor: p.border },
    })
    const series = seriesRef.current
    if (series) {
      const common = {
        priceLineColor: p.accent,
        crosshairMarkerBorderColor: p.accent,
        crosshairMarkerBackgroundColor: p.bg,
      }
      if (chartTypeRef.current === 'area') {
        series.applyOptions({
          ...common,
          lineColor: p.accent,
          topColor: p.areaTop,
          bottomColor: p.areaBottom,
        })
      } else {
        series.applyOptions({ ...common, color: p.accent })
      }
    }
  }, [showGrid, isDark])

  // 3. Create or switch Series (Area vs Line)
  useEffect(() => {
    if (!chartRef.current) return
    chartTypeRef.current = chartType

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current)
      seriesRef.current = null
    }

    const p = readPalette(isDark)
    const accent = p.accent
    const shared = {
      lineWidth: 2 as const,
      priceLineVisible: true,
      priceLineColor: accent,
      priceLineWidth: 1 as const,
      priceLineStyle: LineStyle.Dashed,
      lastPriceAnimation: LastPriceAnimationMode.Continuous,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: accent,
      crosshairMarkerBackgroundColor: p.bg,
      priceFormat: {
        type: 'price' as const,
        precision: 2,
        minMove: 0.01,
      },
    }

    if (chartType === 'area') {
      seriesRef.current = chartRef.current.addSeries(AreaSeries, {
        ...shared,
        topColor: p.areaTop,
        bottomColor: p.areaBottom,
        lineColor: accent,
      })
    } else {
      seriesRef.current = chartRef.current.addSeries(LineSeries, { ...shared, color: accent })
    }

    // Set dataset immediately if available
    const initialTicks = ticksRef.current
    if (initialTicks.length > 0 && seriesRef.current) {
      const formatted = buildAscendingData(initialTicks)
      if (formatted.length > 0) {
        seriesRef.current.setData(formatted)
        chartRef.current.timeScale().fitContent()
      }
    }
    // isDark is read for the initial palette only; re-theming is effect 2's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType])

  // 4. Update data on tick arrivals with strictly ascending timestamp validation
  useEffect(() => {
    if (!seriesRef.current || ticks.length === 0) return

    const formatted = buildAscendingData(ticks)
    if (formatted.length > 0) {
      seriesRef.current.setData(formatted)
    }
  }, [ticks])

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Subtle TradingView-style symbol watermark in chart center */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] dark:opacity-[0.05] select-none font-extrabold text-2xl xs:text-3xl sm:text-5xl uppercase tracking-wider text-text">
        {symbolLabel}
      </div>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

function buildAscendingData(ticks: Tick[]) {
  const formatted = []
  let lastSec = -1

  for (const t of ticks) {
    const sec = Math.floor(t.time / 1000)
    if (sec > lastSec) {
      formatted.push({
        time: sec as UTCTimestamp,
        value: t.price,
      })
      lastSec = sec
    }
  }

  return formatted
}
