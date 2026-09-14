import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BalanceType, Position } from '../types'

interface AccountState {
  balanceType: BalanceType
  setBalanceType: (b: BalanceType) => void
  balances: Record<BalanceType, number>
  positions: Position[]
  placeTrade: (contract: string, symbol: string, stake: number, payoutPct: number) => void
  resetDemo: () => void
  user: { name: string; email: string }
}

const AccountCtx = createContext<AccountState | null>(null)

// Demo/portfolio data only. No real user data, payments, or trading is ever connected.
const MOCK_USER = { name: 'Alex Rivera', email: 'al***ex@example.com' }

export function AccountProvider({ children }: { children: ReactNode }) {
  const [balanceType, setBalanceType] = useState<BalanceType>('demo')
  const [balances, setBalances] = useState<Record<BalanceType, number>>({ real: 0, demo: 10000 })
  const [positions, setPositions] = useState<Position[]>([])

  const placeTrade = useCallback(
    (contract: string, symbol: string, stake: number, payoutPct: number) => {
      setBalances((prev) => ({ ...prev, [balanceType]: prev[balanceType] - stake }))
      const id = crypto.randomUUID()
      const payout = Number((stake * (1 + payoutPct / 100)).toFixed(2))
      const position: Position = {
        id,
        symbol,
        contract,
        stake,
        payout,
        status: 'open',
        openedAt: Date.now(),
      }
      setPositions((prev) => [position, ...prev])

      window.setTimeout(() => {
        const won = Math.random() * 100 < payoutPct / 2 + 45
        setPositions((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: won ? 'won' : 'lost',
                  closedAt: Date.now(),
                  profit: won ? payout - stake : -stake,
                }
              : p,
          ),
        )
        if (won) {
          setBalances((prev) => ({ ...prev, [balanceType]: prev[balanceType] + payout }))
        }
      }, 4000)
    },
    [balanceType],
  )

  const resetDemo = useCallback(() => {
    setBalances((prev) => ({ ...prev, demo: 10000 }))
  }, [])

  const value = useMemo(
    () => ({ balanceType, setBalanceType, balances, positions, placeTrade, resetDemo, user: MOCK_USER }),
    [balanceType, balances, positions, placeTrade, resetDemo],
  )

  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountCtx)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
