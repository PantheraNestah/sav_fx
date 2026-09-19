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
  contractGroup?: ContractGroup
  side?: string
  targetDigit?: number
  barrier?: number
  stake: number
  payout: number
  payoutPct: number
  status: PositionStatus
  openedAt: number
  closedAt?: number
  profit?: number
  entrySpot?: number
  exitSpot?: number
  exitDigit?: number
  balanceType: BalanceType
}

export type TransactionType = 'deposit' | 'withdrawal' | 'stake' | 'payout' | 'fee'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  balanceType: BalanceType
  timestamp: number
  description: string
  status: 'completed' | 'pending' | 'failed'
  method?: string
  positionId?: string
}

export interface AutoSessionState {
  isActive: boolean
  baseStake: number
  currentStake: number
  lossMultiple: number
  targetProfit: number
  targetLoss: number
  step: number
  maxSteps: number
  consecutiveLosses: number
  sessionProfit: number
  totalTrades: number
  wins: number
  losses: number
  side?: string
  contractGroup?: ContractGroup
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  timestamp: number
  type: 'win' | 'loss' | 'deposit' | 'system' | 'withdrawal'
  read: boolean
}
