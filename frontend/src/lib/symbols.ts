import type { Symbol } from '../types'

export const SYMBOLS: Symbol[] = [
  { id: 'v10_1s', label: 'Volatility 10 (1s) Index', group: 'Continuous Indices' },
  { id: 'v10', label: 'Volatility 10 Index', group: 'Continuous Indices' },
  { id: 'v15_1s', label: 'Volatility 15 (1s) Index', group: 'Continuous Indices' },
  { id: 'v25_1s', label: 'Volatility 25 (1s) Index', group: 'Continuous Indices' },
  { id: 'v25', label: 'Volatility 25 Index', group: 'Continuous Indices' },
  { id: 'v30_1s', label: 'Volatility 30 (1s) Index', group: 'Continuous Indices' },
  { id: 'v50_1s', label: 'Volatility 50 (1s) Index', group: 'Continuous Indices' },
  { id: 'v50', label: 'Volatility 50 Index', group: 'Continuous Indices' },
]

export const DEFAULT_SYMBOL = SYMBOLS[5]
