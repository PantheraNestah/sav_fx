import { createContext } from 'react'
import type {
  AutoSessionState,
  BalanceType,
  ContractGroup,
  NotificationItem,
  Position,
  Transaction,
} from '../types'

export interface PlaceTradeOptions {
  contract: string
  symbol: string
  /** Backend symbol id (e.g. "v30_1s"); required in live mode, ignored by the built-in simulator. */
  symbolId?: string
  stake: number
  payoutPct: number
  contractGroup?: ContractGroup
  side?: string
  targetDigit?: number
  barrier?: number
  currentPrice?: number
}

export interface StartAutoParams {
  baseStake: number
  lossMultiple: number
  targetProfit: number
  targetLoss: number
  contractGroup: ContractGroup
  side: string
  symbol: string
  symbolId?: string
  payoutPct: number
  targetDigit?: number
  barrier?: number
}

export interface AuthResult {
  success: boolean
  message?: string
  /** Set when the account has 2FA enabled and the login needs a one-time code. */
  otpRequired?: boolean
}

export interface AccountState {
  balanceType: BalanceType
  setBalanceType: (b: BalanceType) => void
  balances: Record<BalanceType, number>
  positions: Position[]
  transactions: Transaction[]
  notifications: NotificationItem[]
  sessionStats: {
    totalTrades: number
    wins: number
    losses: number
    winRate: number
    sessionPl: number
  }
  placeTrade: (opts: PlaceTradeOptions) => string | null
  resetDemo: () => void
  deposit: (amount: number, method: string) => void
  withdraw: (amount: number, method: string, destination: string) => boolean | Promise<boolean>
  user: { name: string; email: string }
  updateUser: (data: { name: string }) => void
  activePositionDetail: Position | null
  openPositionDetail: (p: Position) => void
  closePositionDetail: () => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  autoSession: AutoSessionState
  startAutoSession: (params: StartAutoParams) => void
  stopAutoSession: () => void
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean, otp?: string) => Promise<AuthResult>
  register: (fullName: string, email: string, password: string) => Promise<AuthResult>
  logout: () => void
}

export const AccountCtx = createContext<AccountState | null>(null)
