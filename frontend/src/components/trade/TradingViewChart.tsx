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

  useEffect(() => {
    onChartReadyRef.current = onChartReady
    ticksRef.current = ticks
  })

  // 1. Initialize Chart Instance with complete TradingView layout options
  useEffect(() => {
    if (!containerRef.current) return

    const bg = isDark ? '#0b1220' : '#ffffff'
    const textColor = isDark ? '#94a3b8' : '#64748b'
    const borderColor = isDark ? 'rgba(51, 65, 85, 0.45)' : '#e2e8f0'
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.28)' : 'rgba(226, 232, 240, 0.85)'
    const accent = isDark ? '#2dd4bf' : '#0d9488'

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: textColor,
        fontSize: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
      grid: {
        vertLines: { visible: showGrid, color: gridColor, style: LineStyle.Dotted },
        horzLines: { visible: showGrid, color: gridColor, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: accent,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#142238' : '#0f766e',
        },
        horzLine: {
          color: accent,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#142238' : '#0f766e',
        },
      },
      rightPriceScale: {
        borderColor: borderColor,
        visible: true,
        autoScale: true,
        alignLabels: true,
        scaleMargins: {
          top: 0.12,
          bottom: 0.14,
        },
      },
      timeScale: {
        borderColor: borderColor,
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
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          const { width, height } = entry.contentRect
          chart.resize(width, height)
        }
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [isDark, showGrid])

  // 2. Update Grid Visibility & Colors dynamically
  useEffect(() => {
    if (!chartRef.current) return
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.28)' : 'rgba(226, 232, 240, 0.85)'
    chartRef.current.applyOptions({
      grid: {
        vertLines: { visible: showGrid, color: gridColor, style: LineStyle.Dotted },
        horzLines: { visible: showGrid, color: gridColor, style: LineStyle.Dotted },
      },
    })
  }, [showGrid, isDark])

  // 3. Create or switch Series (Area vs Line)
  useEffect(() => {
    if (!chartRef.current) return

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current)
      seriesRef.current = null
    }

    const accent = isDark ? '#2dd4bf' : '#0d9488'

    if (chartType === 'area') {
      const area = chartRef.current.addSeries(AreaSeries, {
        topColor: isDark ? 'rgba(45, 212, 191, 0.35)' : 'rgba(13, 148, 136, 0.25)',
        bottomColor: isDark ? 'rgba(45, 212, 191, 0.01)' : 'rgba(13, 148, 136, 0.01)',
        lineColor: accent,
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: accent,
        priceLineWidth: 1,
        priceLineStyle: LineStyle.Dashed,
        lastPriceAnimation: LastPriceAnimationMode.Continuous,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: accent,
        crosshairMarkerBackgroundColor: isDark ? '#0b1220' : '#ffffff',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      })
      seriesRef.current = area
    } else {
      const line = chartRef.current.addSeries(LineSeries, {
        color: accent,
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: accent,
        priceLineWidth: 1,
        priceLineStyle: LineStyle.Dashed,
        lastPriceAnimation: LastPriceAnimationMode.Continuous,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: accent,
        crosshairMarkerBackgroundColor: isDark ? '#0b1220' : '#ffffff',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      })
      seriesRef.current = line
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
  }, [chartType, isDark])

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
