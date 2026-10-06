import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, freshAccessToken, onAuthLost, tokens, wsUrl } from '../lib/api'
import { SYMBOLS } from '../lib/symbols'
import type { AutoSessionState, BalanceType, NotificationItem, Position, Transaction } from '../types'
import { AccountCtx, type AccountState, type PlaceTradeOptions, type StartAutoParams } from './accountCtx'
import { useToast } from './useToast'

const USER_KEY = 'dash-user'

const IDLE_AUTO: AutoSessionState = {
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

interface AuthPayload {
  user: { name: string; email: string }
  accessToken: string
  refreshToken: string
}

interface AutoDto extends Omit<AutoSessionState, 'isActive'> {
  isActive: boolean
}

function readUser(): { name: string; email: string } {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return { name: '', email: '' }
}

const upsert = (list: Position[], p: Position): Position[] =>
  list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list]

const STOP_TOASTS: Record<string, { title: string; message: string; type: 'success' | 'warning' | 'error' }> = {
  target_profit: { title: 'Auto Trading Goal Hit! 🎯', message: 'Target profit reached. Session stopped.', type: 'success' },
  target_loss: { title: 'Target Loss Limit Hit 🛑', message: 'Target loss reached. Auto trading halted.', type: 'warning' },
  max_steps: { title: 'Max Martingale Steps Reached', message: 'Stopping auto trading to protect balance.', type: 'warning' },
  insufficient_balance: { title: 'Insufficient Balance for Next Step', message: 'The next stake exceeds your balance.', type: 'error' },
  stake_limit: { title: 'Stake Limit Reached', message: 'The next stake exceeds the maximum allowed.', type: 'warning' },
}

/** AccountState backed by the FastAPI server: REST for actions, /ws/account for live updates. */
export function LiveAccountProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [authed, setAuthed] = useState(() => tokens.has())
  const [user, setUser] = useState(readUser)
  const [balanceType, setBalanceType] = useState<BalanceType>('demo')
  const [balances, setBalances] = useState<Record<BalanceType, number>>({ real: 0, demo: 0 })
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [autoSession, setAutoSession] = useState<AutoSessionState>(IDLE_AUTO)
  const [activePositionDetail, setActivePositionDetail] = useState<Position | null>(null)

  const balancesRef = useRef(balances)
  const balanceTypeRef = useRef(balanceType)
  const autoRef = useRef(autoSession)
  useEffect(() => {
    balancesRef.current = balances
    balanceTypeRef.current = balanceType
    autoRef.current = autoSession
  }, [balances, balanceType, autoSession])

  const persistUser = useCallback((u: { name: string; email: string }) => {
    setUser(u)
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u))
    } catch {
      // ignore
    }
  }, [])

  const refreshTransactions = useCallback(async () => {
    try {
      const page = await api<{ items: Transaction[] }>('/api/account/transactions?limit=100')
      setTransactions(page.items)
    } catch {
      // transient; the next event retries
    }
  }, [])

  const loadAll = useCallback(async () => {
    const [me, bal, pos, notes, auto] = await Promise.all([
      api<{ name: string; email: string }>('/api/auth/me'),
      api<Record<BalanceType, number>>('/api/account/balance'),
      api<{ items: Position[] }>('/api/trades?limit=100'),
      api<NotificationItem[]>('/api/account/notifications'),
      api<AutoDto | null>('/api/trades/auto'),
    ])
    persistUser({ name: me.name, email: me.email })
    setBalances(bal)
    setPositions(pos.items)
    setNotifications(notes)
    setAutoSession(auto ? { ...IDLE_AUTO, ...auto } : IDLE_AUTO)
    void refreshTransactions()
  }, [persistUser, refreshTransactions])

  const clearSession = useCallback(() => {
    tokens.set(null)
    setAuthed(false)
    setPositions([])
    setTransactions([])
    setNotifications([])
    setBalances({ real: 0, demo: 0 })
    setAutoSession(IDLE_AUTO)
  }, [])

  useEffect(() => onAuthLost(clearSession), [clearSession])

  // Live push channel
  useEffect(() => {
    if (!authed) return
    let closed = false
    let ws: WebSocket | null = null
    let timer: number | undefined
    let retry = 0
    let txTimer: number | undefined

    const scheduleTx = () => {
      window.clearTimeout(txTimer)
      txTimer = window.setTimeout(() => void refreshTransactions(), 300)
    }

    const handle = (msg: { type: string; data: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      switch (msg.type) {
        case 'balance':
          setBalances(msg.data)
          scheduleTx()
          break
        case 'position.opened':
          setPositions((prev) => upsert(prev, msg.data))
          break
        case 'position.settled': {
          const p = msg.data as Position
          setPositions((prev) => upsert(prev, p))
          if (p.status === 'won') {
            showToast({
              title: `Trade Won! +$${(p.profit ?? 0).toFixed(2)} USD`,
              message: `${p.contract} · Payout $${p.payout.toFixed(2)} credited`,
              type: 'success',
            })
          } else {
            showToast({
              title: `Trade Lost (-$${p.stake.toFixed(2)} USD)`,
              message: `${p.contract} expired out of the money.`,
              type: 'error',
            })
          }
          break
        }
        case 'notification':
          setNotifications((prev) => [msg.data, ...prev.filter((n) => n.id !== msg.data.id)])
          break
        case 'auto.update': {
          const next = { ...IDLE_AUTO, ...msg.data } as AutoSessionState
          const prev = autoRef.current
          setAutoSession(next)
          if (prev.id === next.id && prev.isActive && !next.isActive && next.stopReason && STOP_TOASTS[next.stopReason]) {
            showToast(STOP_TOASTS[next.stopReason])
          }
          break
        }
      }
    }

    const connect = async () => {
      const token = await freshAccessToken()
      if (closed || !token) return
      ws = new WebSocket(wsUrl(`/ws/account?token=${encodeURIComponent(token)}`))
      ws.onopen = () => {
        if (retry > 0) void loadAll().catch(() => {}) // resync anything missed while offline
        retry = 0
      }
      ws.onmessage = (e) => {
        try {
          handle(JSON.parse(e.data))
        } catch {
          // ignore malformed frame
        }
      }
      ws.onclose = () => {
        if (closed) return
        timer = window.setTimeout(() => void connect(), Math.min(1000 * 2 ** retry++, 15000))
      }
    }

    loadAll().catch((e) => {
      if (!(e instanceof ApiError && e.status === 401)) {
        showToast({ title: 'Connection problem', message: (e as Error).message, type: 'error' })
      }
    })
    void connect()

    return () => {
      closed = true
      window.clearTimeout(timer)
      window.clearTimeout(txTimer)
      ws?.close()
    }
  }, [authed, loadAll, refreshTransactions, showToast])

  const sessionStats = useMemo(() => {
    const closed = positions.filter((p) => p.status !== 'open')
    const wins = closed.filter((p) => p.status === 'won').length
    const pl = closed.reduce((sum, p) => sum + (p.profit ?? 0), 0)
    return {
      totalTrades: closed.length,
      wins,
      losses: closed.length - wins,
      winRate: closed.length ? Math.round((wins / closed.length) * 1000) / 10 : 0,
      sessionPl: Number(pl.toFixed(2)),
    }
  }, [positions])

  const fail = useCallback(
    (title: string, e: unknown) =>
      showToast({ title, message: e instanceof Error ? e.message : 'Something went wrong.', type: 'error' }),
    [showToast],
  )

  const symbolIdFor = (o: { symbolId?: string; symbol: string }) =>
    o.symbolId ?? SYMBOLS.find((s) => s.label === o.symbol)?.id ?? o.symbol

  const placeTrade = useCallback(
    (opts: PlaceTradeOptions): string | null => {
      const bt = balanceTypeRef.current
      if (opts.stake <= 0) {
        showToast({ title: 'Invalid Stake', message: 'Stake amount must be greater than $0.00', type: 'warning' })
        return null
      }
      if (opts.stake > balancesRef.current[bt]) {
        showToast({
          title: 'Insufficient Balance',
          message: `Your ${bt} balance is $${balancesRef.current[bt].toFixed(2)}. Stake is $${opts.stake.toFixed(2)}.`,
          type: 'error',
        })
        return null
      }
      api<Position>('/api/trades', {
        body: {
          balanceType: bt,
          symbol: symbolIdFor(opts),
          contractGroup: opts.contractGroup,
          side: opts.side,
          targetDigit: opts.targetDigit,
          barrier: opts.barrier,
          stake: Number(opts.stake.toFixed(2)),
        },
      })
        .then((p) => setPositions((prev) => upsert(prev, p)))
        .catch((e) => fail('Trade rejected', e))
      return null // the server assigns the id; the position arrives via the response / push channel
    },
    [fail, showToast],
  )

  const startAutoSession = useCallback(
    (p: StartAutoParams) => {
      api<AutoDto>('/api/trades/auto', {
        body: {
          balanceType: balanceTypeRef.current,
          symbol: symbolIdFor(p),
          contractGroup: p.contractGroup,
          side: p.side,
          targetDigit: p.targetDigit,
          barrier: p.barrier,
          baseStake: p.baseStake,
          lossMultiple: p.lossMultiple,
          targetProfit: p.targetProfit,
          targetLoss: p.targetLoss,
        },
      })
        .then((a) => {
          setAutoSession({ ...IDLE_AUTO, ...a })
          showToast({
            title: 'Auto Trading Started 🤖',
            message: `Target Profit: +$${p.targetProfit} | Loss Limit: -$${p.targetLoss}`,
            type: 'info',
          })
        })
        .catch((e) => fail('Could not start auto trading', e))
    },
    [fail, showToast],
  )

  const stopAutoSession = useCallback(() => {
    const id = autoRef.current.id
    if (!id) return
    api<AutoDto>(`/api/trades/auto/${id}/stop`, { method: 'POST' })
      .then((a) => {
        setAutoSession({ ...IDLE_AUTO, ...a })
        showToast({ title: 'Auto Trading Stopped', message: 'Automated runner has been manually halted.', type: 'info' })
      })
      .catch((e) => fail('Could not stop auto trading', e))
  }, [fail, showToast])

  const deposit = useCallback(
    (amount: number, method: string) => {
      api<{ balances: Record<BalanceType, number> }>('/api/account/deposit', { body: { amount, method } })
        .then((r) => {
          setBalances(r.balances)
          showToast({ title: 'Deposit Successful', message: `$${amount.toFixed(2)} USD deposited via ${method}.`, type: 'success' })
        })
        .catch((e) => fail('Deposit failed', e))
    },
    [fail, showToast],
  )

  const withdraw = useCallback(
    async (amount: number, method: string, destination: string) => {
      try {
        const r = await api<{ balances: Record<BalanceType, number> }>('/api/account/withdraw', {
          body: { amount, method, destination },
        })
        setBalances(r.balances)
        showToast({ title: 'Withdrawal Processed', message: `$${amount.toFixed(2)} sent to ${destination}.`, type: 'success' })
        return true
      } catch (e) {
        fail('Withdrawal failed', e)
        return false
      }
    },
    [fail, showToast],
  )

  const resetDemo = useCallback(() => {
    api<{ balances: Record<BalanceType, number> }>('/api/account/reset-demo', { method: 'POST' })
      .then((r) => {
        setBalances(r.balances)
        showToast({ title: 'Demo Balance Reset', message: 'Demo trading funds restored to $10,000.00 USD.', type: 'info' })
      })
      .catch((e) => fail('Reset failed', e))
  }, [fail, showToast])

  const updateUser = useCallback(
    (data: { name: string }) => {
      api<{ name: string; email: string }>('/api/settings/profile', { method: 'PATCH', body: data })
        .then((u) => {
          persistUser({ name: u.name, email: u.email })
          showToast({ title: 'Profile Updated', message: 'Your personal information has been saved.', type: 'success' })
        })
        .catch((e) => fail('Update failed', e))
    },
    [fail, persistUser, showToast],
  )

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    api(`/api/account/notifications/${id}/read`, { method: 'POST' }).catch(() => {})
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    api('/api/account/notifications/read-all', { method: 'POST' }).catch(() => {})
  }, [])

  const login = useCallback(
    async (email: string, password: string, remember?: boolean, otp?: string) => {
      try {
        const r = await api<AuthPayload>('/api/auth/login', { body: { email, password, otp: otp || undefined }, auth: false })
        tokens.set({ access: r.accessToken, refresh: r.refreshToken })
        persistUser(r.user)
        try {
          if (remember) localStorage.setItem('Dash_remember_email', email.trim())
          else localStorage.removeItem('Dash_remember_email')
        } catch {
          // ignore
        }
        setAuthed(true)
        showToast({ title: 'Welcome Back', message: `Logged in as ${r.user.name}.`, type: 'success' })
        return { success: true }
      } catch (e) {
        if (e instanceof ApiError && e.message === 'otp_required') {
          return { success: false, otpRequired: true, message: 'Enter the 6-digit code from your authenticator app.' }
        }
        return { success: false, message: e instanceof Error ? e.message : 'Login failed.' }
      }
    },
    [persistUser, showToast],
  )

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      try {
        const r = await api<AuthPayload>('/api/auth/register', { body: { fullName, email, password }, auth: false })
        tokens.set({ access: r.accessToken, refresh: r.refreshToken })
        persistUser(r.user)
        setAuthed(true)
        showToast({ title: 'Account Created', message: `Welcome to Dash, ${r.user.name}!`, type: 'success' })
        return { success: true }
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'Registration failed.' }
      }
    },
    [persistUser, showToast],
  )

  const logout = useCallback(() => {
    const refresh = (() => {
      try {
        return JSON.parse(localStorage.getItem('dash-tokens') ?? 'null')?.refresh as string | undefined
      } catch {
        return undefined
      }
    })()
    if (refresh) void api('/api/auth/logout', { body: { refreshToken: refresh }, auth: false }).catch(() => {})
    clearSession()
    showToast({ title: 'Signed Out', message: 'You have been safely logged out.', type: 'info' })
  }, [clearSession, showToast])

  const value: AccountState = useMemo(
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
      isAuthenticated: authed,
      login,
      register,
      logout,
    }),
    [
      balanceType, balances, positions, transactions, notifications, sessionStats, placeTrade, resetDemo, deposit,
      withdraw, user, updateUser, activePositionDetail, markNotificationRead, markAllNotificationsRead, autoSession,
      startAutoSession, stopAutoSession, authed, login, register, logout,
    ],
  )

  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>
}
