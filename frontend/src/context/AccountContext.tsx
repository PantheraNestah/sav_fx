import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AutoSessionState,
  BalanceType,
  ContractGroup,
  NotificationItem,
  Position,
  Transaction,
} from '../types'
import { useToast } from './useToast'

export interface PlaceTradeOptions {
  contract: string
  symbol: string
  stake: number
  payoutPct: number
  contractGroup?: ContractGroup
  side?: string
  targetDigit?: number
  barrier?: number
  currentPrice?: number
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
  withdraw: (amount: number, method: string, destination: string) => boolean
  user: { name: string; email: string }
  updateUser: (data: { name: string }) => void
  activePositionDetail: Position | null
  openPositionDetail: (p: Position) => void
  closePositionDetail: () => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  autoSession: AutoSessionState
  startAutoSession: (params: {
    baseStake: number
    lossMultiple: number
    targetProfit: number
    targetLoss: number
    contractGroup: ContractGroup
    side: string
    symbol: string
    payoutPct: number
    targetDigit?: number
    barrier?: number
  }) => void
  stopAutoSession: () => void
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; message?: string }>
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
}

export const AccountCtx = createContext<AccountState | null>(null)

const MOCK_USER = { name: 'Alex Rivera', email: 'al***ex@example.com' }

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-seed-1',
    type: 'deposit',
    amount: 10000,
    balanceType: 'demo',
    timestamp: Date.now() - 3600000 * 24,
    description: 'Initial practice demo grant',
    status: 'completed',
    method: 'System Bootstrap',
  },
]

const INITIAL_AUTO_SESSION: AutoSessionState = {
  isActive: false,
  baseStake: 10,
  currentStake: 10,
  lossMultiple: 2,
  targetProfit: 200,
  targetLoss: 500,
  step: 1,
  maxSteps: 8,
  consecutiveLosses: 0,
  sessionProfit: 0,
  totalTrades: 0,
  wins: 0,
  losses: 0,
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [balanceType, setBalanceType] = useState<BalanceType>('demo')
  const [balances, setBalances] = useState<Record<BalanceType, number>>({ real: 0, demo: 10000 })
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => [
    {
      id: 'notif-1',
      title: 'Welcome to Dash',
      message: 'Demo balance credited with $10,000 practice funds.',
      timestamp: Date.now() - 1800000,
      type: 'system',
      read: false,
    },
  ])
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const stored = localStorage.getItem('Dash_auth')
    if (stored === 'false') return false
    return true
  })
  const [user, setUser] = useState(() => {
    const savedName = localStorage.getItem('Dash_user_name')
    const savedEmail = localStorage.getItem('Dash_user_email')
    if (savedName && savedEmail) {
      return { name: savedName, email: savedEmail }
    }
    return MOCK_USER
  })
  const [activePositionDetail, setActivePositionDetail] = useState<Position | null>(null)
  const [autoSession, setAutoSession] = useState<AutoSessionState>(INITIAL_AUTO_SESSION)

  const handleAutoTradeResolutionRef = useRef<(won: boolean, profit: number, opts: PlaceTradeOptions) => void>(() => {})

  // Session stats derived from resolved positions
  const sessionStats = useMemo(() => {
    const closed = positions.filter((p) => p.status !== 'open')
    const wins = closed.filter((p) => p.status === 'won').length
    const losses = closed.filter((p) => p.status === 'lost').length
    const sessionPl = closed.reduce((sum, p) => sum + (p.profit ?? 0), 0)
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0
    return {
      totalTrades: closed.length,
      wins,
      losses,
      winRate: Math.round(winRate * 10) / 10,
      sessionPl: Number(sessionPl.toFixed(2)),
    }
  }, [positions])

  // Ref to hold auto-session state for async resolution callbacks
  const autoSessionRef = useRef(autoSession)
  useEffect(() => {
    autoSessionRef.current = autoSession
  }, [autoSession])

  const balancesRef = useRef(balances)
  useEffect(() => {
    balancesRef.current = balances
  }, [balances])

  const balanceTypeRef = useRef(balanceType)
  useEffect(() => {
    balanceTypeRef.current = balanceType
  }, [balanceType])

  const addNotification = useCallback((notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const item: NotificationItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
      ...notif,
    }
    setNotifications((prev) => [item, ...prev])
  }, [])

  // Place Trade callback
  const placeTrade = useCallback(
    (opts: PlaceTradeOptions): string | null => {
      const currentBalance = balancesRef.current[balanceTypeRef.current]
      if (opts.stake <= 0) {
        showToast({
          title: 'Invalid Stake',
          message: 'Stake amount must be greater than $0.00',
          type: 'warning',
        })
        return null
      }

      if (opts.stake > currentBalance) {
        showToast({
          title: 'Insufficient Balance',
          message: `Your ${balanceTypeRef.current} balance is $${currentBalance.toFixed(2)}. Stake is $${opts.stake.toFixed(2)}.`,
          type: 'error',
        })
        return null
      }

      const id = crypto.randomUUID()
      const payout = Number((opts.stake * (1 + opts.payoutPct / 100)).toFixed(2))
      const entrySpot = opts.currentPrice ?? 9600.0

      // Debit balance
      setBalances((prev) => ({
        ...prev,
        [balanceTypeRef.current]: Number((prev[balanceTypeRef.current] - opts.stake).toFixed(2)),
      }))

      // Register stake ledger entry
      const stakeTx: Transaction = {
        id: `tx-stake-${id.slice(0, 8)}`,
        type: 'stake',
        amount: -opts.stake,
        balanceType: balanceTypeRef.current,
        timestamp: Date.now(),
        description: `Stake on ${opts.contract} (${opts.symbol})`,
        status: 'completed',
        positionId: id,
      }
      setTransactions((prev) => [stakeTx, ...prev])

      const newPosition: Position = {
        id,
        symbol: opts.symbol,
        contract: opts.contract,
        contractGroup: opts.contractGroup,
        side: opts.side,
        targetDigit: opts.targetDigit,
        barrier: opts.barrier,
        stake: opts.stake,
        payout,
        payoutPct: opts.payoutPct,
        status: 'open',
        openedAt: Date.now(),
        entrySpot,
        balanceType: balanceTypeRef.current,
      }

      setPositions((prev) => [newPosition, ...prev])

      // Simulate contract settlement after 3.8s
      window.setTimeout(() => {
        // Contract probability roll
        const won = Math.random() * 100 < opts.payoutPct / 2 + 45
        const exitDigit = Math.floor(Math.random() * 10)
        const exitSpot = Number((entrySpot + (Math.random() - 0.5) * 4).toFixed(2))
        const profit = won ? Number((payout - opts.stake).toFixed(2)) : -opts.stake

        setPositions((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: won ? 'won' : 'lost',
                  closedAt: Date.now(),
                  profit,
                  exitSpot,
                  exitDigit,
                }
              : p,
          ),
        )

        if (won) {
          setBalances((prev) => ({
            ...prev,
            [newPosition.balanceType]: Number((prev[newPosition.balanceType] + payout).toFixed(2)),
          }))

          const payoutTx: Transaction = {
            id: `tx-payout-${id.slice(0, 8)}`,
            type: 'payout',
            amount: payout,
            balanceType: newPosition.balanceType,
            timestamp: Date.now(),
            description: `Won payout on ${opts.contract}`,
            status: 'completed',
            positionId: id,
          }
          setTransactions((prev) => [payoutTx, ...prev])

          addNotification({
            title: `Won Trade: +$${profit.toFixed(2)}`,
            message: `${opts.contract} on ${opts.symbol} settled favorably.`,
            type: 'win',
          })

          showToast({
            title: `Trade Won! +$${profit.toFixed(2)} USD`,
            message: `${opts.contract} · Payout $${payout.toFixed(2)} credited`,
            type: 'success',
          })
        } else {
          addNotification({
            title: `Trade Lost: -$${opts.stake.toFixed(2)}`,
            message: `${opts.contract} on ${opts.symbol} did not win.`,
            type: 'loss',
          })

          showToast({
            title: `Trade Lost (-$${opts.stake.toFixed(2)} USD)`,
            message: `${opts.contract} expired out of the money.`,
            type: 'error',
          })
        }

        // Auto-trading session hook
        handleAutoTradeResolutionRef.current(won, profit, opts)
      }, 3800)

      return id
    },
    [addNotification, showToast],
  )

  // Auto-trading step progression logic
  const handleAutoTradeResolution = useCallback(
    (won: boolean, profit: number, lastOpts: PlaceTradeOptions) => {
      const session = autoSessionRef.current
      if (!session.isActive) return

      const newSessionProfit = Number((session.sessionProfit + profit).toFixed(2))
      const newTotalTrades = session.totalTrades + 1
      const newWins = won ? session.wins + 1 : session.wins
      const newLosses = won ? session.losses : session.losses + 1
      const newConsecutiveLosses = won ? 0 : session.consecutiveLosses + 1
      const nextStep = won ? 1 : Math.min(session.maxSteps, session.step + 1)

      // Target profit reached
      if (newSessionProfit >= session.targetProfit) {
        setAutoSession((prev) => ({
          ...prev,
          isActive: false,
          sessionProfit: newSessionProfit,
          totalTrades: newTotalTrades,
          wins: newWins,
          losses: newLosses,
        }))
        showToast({
          title: 'Auto Trading Goal Hit! 🎯',
          message: `Target profit reached (+${newSessionProfit.toFixed(2)} USD). Session stopped.`,
          type: 'success',
        })
        return
      }

      // Target loss limit hit
      if (newSessionProfit <= -session.targetLoss) {
        setAutoSession((prev) => ({
          ...prev,
          isActive: false,
          sessionProfit: newSessionProfit,
          totalTrades: newTotalTrades,
          wins: newWins,
          losses: newLosses,
        }))
        showToast({
          title: 'Target Loss Limit Hit 🛑',
          message: `Target loss reached (${newSessionProfit.toFixed(2)} USD). Auto trading halted.`,
          type: 'warning',
        })
        return
      }

      // Max Martingale steps reached
      if (!won && session.step >= session.maxSteps) {
        setAutoSession((prev) => ({
          ...prev,
          isActive: false,
          sessionProfit: newSessionProfit,
          totalTrades: newTotalTrades,
          wins: newWins,
          losses: newLosses,
        }))
        showToast({
          title: 'Max Martingale Steps Reached',
          message: `Reached step ${session.maxSteps}. Stopping auto trading to protect balance.`,
          type: 'warning',
        })
        return
      }

      // Compute next stake
      let nextStake = session.baseStake
      if (!won) {
        nextStake = Number((session.baseStake * Math.pow(session.lossMultiple, newConsecutiveLosses)).toFixed(2))
      }

      // Check balance
      const currentBalance = balancesRef.current[balanceTypeRef.current]
      if (nextStake > currentBalance) {
        setAutoSession((prev) => ({
          ...prev,
          isActive: false,
          sessionProfit: newSessionProfit,
        }))
        showToast({
          title: 'Insufficient Balance for Next Step',
          message: `Required stake ($${nextStake.toFixed(2)}) exceeds balance ($${currentBalance.toFixed(2)}).`,
          type: 'error',
        })
        return
      }

      setAutoSession((prev) => ({
        ...prev,
        step: nextStep,
        consecutiveLosses: newConsecutiveLosses,
        currentStake: nextStake,
        sessionProfit: newSessionProfit,
        totalTrades: newTotalTrades,
        wins: newWins,
        losses: newLosses,
      }))

      // Trigger next trade after 1.2s pause
      window.setTimeout(() => {
        if (!autoSessionRef.current.isActive) return
        placeTrade({
          ...lastOpts,
          stake: nextStake,
        })
      }, 1200)
    },
    [placeTrade, showToast],
  )

  useEffect(() => {
    handleAutoTradeResolutionRef.current = handleAutoTradeResolution
  }, [handleAutoTradeResolution])

  const startAutoSession = useCallback(
    (params: {
      baseStake: number
      lossMultiple: number
      targetProfit: number
      targetLoss: number
      contractGroup: ContractGroup
      side: string
      symbol: string
      payoutPct: number
      targetDigit?: number
      barrier?: number
    }) => {
      const currentBalance = balancesRef.current[balanceTypeRef.current]
      if (params.baseStake <= 0 || params.baseStake > currentBalance) {
        showToast({
          title: 'Invalid Base Stake',
          message: 'Ensure base stake is greater than $0 and does not exceed balance.',
          type: 'error',
        })
        return
      }

      const newSession: AutoSessionState = {
        isActive: true,
        baseStake: params.baseStake,
        currentStake: params.baseStake,
        lossMultiple: params.lossMultiple,
        targetProfit: params.targetProfit,
        targetLoss: params.targetLoss,
        step: 1,
        maxSteps: 8,
        consecutiveLosses: 0,
        sessionProfit: 0,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        side: params.side,
        contractGroup: params.contractGroup,
      }

      setAutoSession(newSession)
      showToast({
        title: 'Auto Trading Started 🤖',
        message: `Target Profit: +$${params.targetProfit} | Loss Limit: -$${params.targetLoss}`,
        type: 'info',
      })

      // Immediately launch the first trade
      placeTrade({
        contract: `${params.contractGroup} · ${params.side}`,
        symbol: params.symbol,
        stake: params.baseStake,
        payoutPct: params.payoutPct,
        contractGroup: params.contractGroup,
        side: params.side,
        targetDigit: params.targetDigit,
        barrier: params.barrier,
      })
    },
    [placeTrade, showToast],
  )

  const stopAutoSession = useCallback(() => {
    setAutoSession((prev) => ({ ...prev, isActive: false }))
    showToast({
      title: 'Auto Trading Stopped',
      message: 'Automated runner has been manually halted.',
      type: 'info',
    })
  }, [showToast])

  const deposit = useCallback(
    (amount: number, method: string) => {
      if (amount <= 0) return
      setBalances((prev) => ({
        ...prev,
        real: Number((prev.real + amount).toFixed(2)),
      }))

      const tx: Transaction = {
        id: `tx-dep-${Date.now().toString(36)}`,
        type: 'deposit',
        amount,
        balanceType: 'real',
        timestamp: Date.now(),
        description: `Deposit via ${method}`,
        status: 'completed',
        method,
      }
      setTransactions((prev) => [tx, ...prev])

      addNotification({
        title: `Deposit Credited: +$${amount.toFixed(2)}`,
        message: `Successfully processed via ${method}. Real funds are ready.`,
        type: 'deposit',
      })

      showToast({
        title: 'Deposit Successful',
        message: `$${amount.toFixed(2)} USD deposited via ${method}.`,
        type: 'success',
      })
    },
    [addNotification, showToast],
  )

  const withdraw = useCallback(
    (amount: number, method: string, destination: string): boolean => {
      if (amount < 10) {
        showToast({
          title: 'Minimum Withdrawal $10.00',
          message: 'The minimum withdrawal limit is $10.00 USD.',
          type: 'warning',
        })
        return false
      }

      if (amount > balances.real) {
        showToast({
          title: 'Insufficient Real Balance',
          message: `Requested $${amount.toFixed(2)}, but real balance is $${balances.real.toFixed(2)}.`,
          type: 'error',
        })
        return false
      }

      setBalances((prev) => ({
        ...prev,
        real: Number((prev.real - amount).toFixed(2)),
      }))

      const tx: Transaction = {
        id: `tx-wd-${Date.now().toString(36)}`,
        type: 'withdrawal',
        amount: -amount,
        balanceType: 'real',
        timestamp: Date.now(),
        description: `Withdrawal to ${method} (${destination})`,
        status: 'completed',
        method,
      }
      setTransactions((prev) => [tx, ...prev])

      addNotification({
        title: `Withdrawal Submitted: -$${amount.toFixed(2)}`,
        message: `Payout sent to ${method} (${destination}).`,
        type: 'withdrawal',
      })

      showToast({
        title: 'Withdrawal Processed',
        message: `$${amount.toFixed(2)} sent to ${destination}.`,
        type: 'success',
      })

      return true
    },
    [balances.real, addNotification, showToast],
  )

  const resetDemo = useCallback(() => {
    setBalances((prev) => ({ ...prev, demo: 10000 }))
    const tx: Transaction = {
      id: `tx-reset-${Date.now().toString(36)}`,
      type: 'deposit',
      amount: 10000,
      balanceType: 'demo',
      timestamp: Date.now(),
      description: 'Reset demo practice balance',
      status: 'completed',
      method: 'Demo Reset',
    }
    setTransactions((prev) => [tx, ...prev])

    showToast({
      title: 'Demo Balance Reset',
      message: 'Demo trading funds restored to $10,000.00 USD.',
      type: 'info',
    })
  }, [showToast])

  const updateUser = useCallback(
    (data: { name: string }) => {
      setUser((prev) => {
        const next = { ...prev, ...data }
        localStorage.setItem('Dash_user_name', next.name)
        return next
      })
      showToast({
        title: 'Profile Updated',
        message: 'Your personal information has been saved.',
        type: 'success',
      })
    },
    [showToast],
  )

  const login = useCallback(
    async (email: string, _password: string, remember?: boolean) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      const cleanEmail = email.trim()
      const fallbackName = cleanEmail.split('@')[0] || 'Trader'
      const capitalized = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1)

      if (remember) {
        localStorage.setItem('Dash_remember_email', cleanEmail)
      } else {
        localStorage.removeItem('Dash_remember_email')
      }

      localStorage.setItem('Dash_auth', 'true')
      localStorage.setItem('Dash_user_name', capitalized)
      localStorage.setItem('Dash_user_email', cleanEmail)

      setUser({ name: capitalized, email: cleanEmail })
      setIsAuthenticated(true)
      showToast({
        title: 'Welcome Back',
        message: `Logged in as ${capitalized}.`,
        type: 'success',
      })
      return { success: true }
    },
    [showToast],
  )

  const register = useCallback(
    async (fullName: string, email: string, _password: string) => {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const cleanName = fullName.trim()
      const cleanEmail = email.trim()

      localStorage.setItem('Dash_auth', 'true')
      localStorage.setItem('Dash_user_name', cleanName)
      localStorage.setItem('Dash_user_email', cleanEmail)

      setUser({ name: cleanName, email: cleanEmail })
      setIsAuthenticated(true)
      showToast({
        title: 'Account Created',
        message: `Welcome to DashOption, ${cleanName}!`,
        type: 'success',
      })
      return { success: true }
    },
    [showToast],
  )

  const logout = useCallback(() => {
    localStorage.setItem('Dash_auth', 'false')
    setIsAuthenticated(false)
    showToast({
      title: 'Signed Out',
      message: 'You have been safely logged out.',
      type: 'info',
    })
  }, [showToast])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const value = useMemo(
    () => ({
      balanceType,
      setBalanceType,
      balances,
      positions,
      transactions,
      notifications,
      sessionStats,
      placeTrade,
      resetDemo,
      deposit,
      withdraw,
      user,
      updateUser,
      activePositionDetail,
      openPositionDetail: (p: Position) => setActivePositionDetail(p),
      closePositionDetail: () => setActivePositionDetail(null),
      markNotificationRead,
      markAllNotificationsRead,
      autoSession,
      startAutoSession,
      stopAutoSession,
      isAuthenticated,
      login,
      register,
      logout,
    }),
    [
      balanceType,
      balances,
      positions,
      transactions,
      notifications,
      sessionStats,
      placeTrade,
      resetDemo,
      deposit,
      withdraw,
      user,
      updateUser,
      activePositionDetail,
      markNotificationRead,
      markAllNotificationsRead,
      autoSession,
      startAutoSession,
      stopAutoSession,
      isAuthenticated,
      login,
      register,
      logout,
    ],
  )

  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>
}
