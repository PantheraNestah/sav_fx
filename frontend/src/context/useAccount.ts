import { useContext } from 'react'
import { AccountCtx } from './AccountContext'

export function useAccount() {
  const ctx = useContext(AccountCtx)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
