import { useEffect, useRef, useState } from 'react'
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

export function usePriceFeed(symbolId: string, basePrice = 9600) {
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
