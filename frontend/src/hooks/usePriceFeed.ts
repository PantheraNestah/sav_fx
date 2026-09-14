import { useEffect, useRef, useState } from 'react'
import type { DigitStat, Tick } from '../types'

const HISTORY_LEN = 60
const DIGIT_WINDOW = 40

function lastDigit(price: number) {
  const str = price.toFixed(2).replace('.', '')
  return Number(str[str.length - 1])
}

export function usePriceFeed(symbolId: string, basePrice = 9600) {
  const [ticks, setTicks] = useState<Tick[]>([])
  const [digits, setDigits] = useState<number[]>([])
  const priceRef = useRef(basePrice)

  useEffect(() => {
    priceRef.current = basePrice + (Math.random() - 0.5) * 20
    setTicks([])
    setDigits([])

    const interval = setInterval(() => {
      const drift = (Math.random() - 0.5) * priceRef.current * 0.0015
      priceRef.current = Math.max(1, priceRef.current + drift)
      const price = Number(priceRef.current.toFixed(2))
      const now = Date.now()

      setTicks((prev) => {
        const next = [...prev, { time: now, price }]
        return next.length > HISTORY_LEN ? next.slice(-HISTORY_LEN) : next
      })
      setDigits((prev) => {
        const next = [...prev, lastDigit(price)]
        return next.length > DIGIT_WINDOW ? next.slice(-DIGIT_WINDOW) : next
      })
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolId])

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
