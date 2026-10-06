import { useEffect, useRef, useState } from 'react'
import { API_ENABLED, wsUrl } from '../lib/api'
import type { DigitStat, Tick } from '../types'

const HISTORY_LEN = 60
const DIGIT_WINDOW = 40

function lastDigit(price: number) {
  const str = price.toFixed(2).replace('.', '')
  return Number(str[str.length - 1])
}

function generateSeedData(base: number, nowSec: number) {
  const seedTicks: Tick[] = []
  const seedDigits: number[] = []
  let p = base + (Math.random() - 0.5) * 15
  for (let i = HISTORY_LEN; i >= 1; i--) {
    p = Math.max(1, p + (Math.random() - 0.5) * p * 0.0015)
    const rounded = Number(p.toFixed(2))
    seedTicks.push({ time: (nowSec - i) * 1000, price: rounded })
    seedDigits.push(lastDigit(rounded))
  }
  return { seedTicks, seedDigits, lastPrice: p }
}

function useMockPriceFeed(symbolId: string, basePrice = 9600) {
  const [ticks, setTicks] = useState<Tick[]>(() => {
    const nowSec = Math.floor(Date.now() / 1000)
    return generateSeedData(basePrice, nowSec).seedTicks
  })
  const [digits, setDigits] = useState<number[]>(() => {
    const nowSec = Math.floor(Date.now() / 1000)
    return generateSeedData(basePrice, nowSec).seedDigits.slice(-DIGIT_WINDOW)
  })

  const priceRef = useRef(basePrice)
  const lastSecRef = useRef(0)

  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000)
    const { seedTicks, seedDigits, lastPrice } = generateSeedData(basePrice, nowSec)
    priceRef.current = lastPrice
    lastSecRef.current = nowSec

    const interval = setInterval(() => {
      const drift = (Math.random() - 0.5) * priceRef.current * 0.0015
      priceRef.current = Math.max(1, priceRef.current + drift)
      const price = Number(priceRef.current.toFixed(2))
      const currentSec = Math.max(lastSecRef.current + 1, Math.floor(Date.now() / 1000))
      lastSecRef.current = currentSec

      setTicks((prev) => {
        const next = [...prev, { time: currentSec * 1000, price }]
        return next.length > HISTORY_LEN * 2 ? next.slice(-HISTORY_LEN * 2) : next
      })
      setDigits((prev) => {
        const next = [...prev, lastDigit(price)]
        return next.length > DIGIT_WINDOW ? next.slice(-DIGIT_WINDOW) : next
      })
    }, 1000)

    const timer = setTimeout(() => {
      setTicks(seedTicks)
      setDigits(seedDigits.slice(-DIGIT_WINDOW))
    }, 0)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [symbolId, basePrice])

  return summarize(ticks, digits, basePrice)
}

function summarize(ticks: Tick[], digits: number[], basePrice: number) {
  const digitStats: DigitStat[] = Array.from({ length: 10 }, (_, digit) => {
    const count = digits.filter((d) => d === digit).length
    const pct = digits.length ? (count / digits.length) * 100 : 10
    return { digit, pct }
  })

  const last = ticks[ticks.length - 1]
  const prev = ticks[ticks.length - 2]
  const change = last && prev ? last.price - prev.price : 0
  const changePct = last && prev && prev.price ? (change / prev.price) * 100 : 0

  return {
    ticks,
    digits,
    digitStats,
    lastDigit: digits[digits.length - 1],
    price: last?.price ?? basePrice,
    change,
    changePct,
  }
}

interface TickMessage {
  type: 'history' | 'tick'
  time: number
  price: number
  digit: number
}

/** Same shape as the simulator, but ticks come from the server's synthetic engine over WebSocket. */
function useLivePriceFeed(symbolId: string, basePrice = 9600) {
  const [ticks, setTicks] = useState<Tick[]>([])
  const [digits, setDigits] = useState<number[]>([])

  useEffect(() => {
    let closed = false
    let ws: WebSocket | null = null
    let timer: number | undefined
    let flushTimer: number | undefined
    let retry = 0
    let backlog: TickMessage[] = []
    let fresh = true // first frames after (re)connect replace whatever was on screen

    const flush = () => {
      window.clearTimeout(flushTimer)
      if (!backlog.length) return
      const batch = backlog
      backlog = []
      const replace = fresh
      fresh = false
      setTicks((prev) => {
        const next = [...(replace ? [] : prev), ...batch.map((m) => ({ time: m.time, price: m.price }))]
        return next.length > HISTORY_LEN * 2 ? next.slice(-HISTORY_LEN * 2) : next
      })
      setDigits((prev) => {
        const next = [...(replace ? [] : prev), ...batch.map((m) => m.digit)]
        return next.length > DIGIT_WINDOW ? next.slice(-DIGIT_WINDOW) : next
      })
    }

    const connect = () => {
      ws = new WebSocket(wsUrl(`/ws/ticks/${encodeURIComponent(symbolId)}`))
      ws.onopen = () => {
        retry = 0
        fresh = true
      }
      ws.onmessage = (e) => {
        let m: TickMessage
        try {
          m = JSON.parse(e.data)
        } catch {
          return
        }
        backlog.push(m)
        if (m.type === 'history') {
          // 60 history frames arrive back-to-back: render them as one batch
          window.clearTimeout(flushTimer)
          flushTimer = window.setTimeout(flush, 25)
        } else {
          flush()
        }
      }
      ws.onclose = () => {
        if (!closed) timer = window.setTimeout(connect, Math.min(1000 * 2 ** retry++, 10000))
      }
    }
    connect()

    return () => {
      closed = true
      window.clearTimeout(timer)
      window.clearTimeout(flushTimer)
      ws?.close()
    }
  }, [symbolId])

  return summarize(ticks, digits, basePrice)
}

export const usePriceFeed = API_ENABLED ? useLivePriceFeed : useMockPriceFeed
