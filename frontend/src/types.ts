export type ContractGroup = 'matches_differs' | 'over_under' | 'even_odd'
export type TradeMode = 'auto' | 'manual'
export type StakeMode = 'stake' | 'payout'
export type BalanceType = 'real' | 'demo'

export interface Symbol {
  id: string
  label: string
  group: string
}

export interface Tick {
  time: number
  price: number
}

export interface DigitStat {
  digit: number
  pct: number
}

export type PositionStatus = 'open' | 'won' | 'lost'

export interface Position {
  id: string
  symbol: string
  contract: string
  stake: number
  payout: number
  status: PositionStatus
  openedAt: number
  closedAt?: number
  profit?: number
}
