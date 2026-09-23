import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { useAccount } from '../context/useAccount'

export function BalanceSelector() {
  const [open, setOpen] = useState(false)
  const { balanceType, setBalanceType, balances, resetDemo } = useAccount()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm hover:border-teal/50"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal/20 text-[10px] font-bold text-teal">
          {balanceType === 'real' ? 'R' : 'D'}
        </span>
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="text-[10px] uppercase text-muted">{balanceType}</span>
          <span className="font-semibold">${balances[balanceType].toFixed(2)}</span>
        </span>
        <span className="font-semibold sm:hidden">${balances[balanceType].toFixed(2)}</span>
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 top-16 z-50 rounded-xl border border-line bg-panel p-4 shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-72 max-w-[calc(100vw-1.5rem)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Trading account</p>
                <p className="font-semibold">Select balance</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-text">
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => {
                setBalanceType('real')
                setOpen(false)
              }}
              className={`mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                balanceType === 'real' ? 'border-teal bg-panel-light' : 'border-line hover:border-line'
              }`}
            >
              <div>
                <p className="text-sm font-semibold">Real balance</p>
                <p className="text-xs text-muted">Live funds</p>
              </div>
              <span className="font-semibold">${balances.real.toFixed(2)}</span>
            </button>

            <button
              onClick={() => {
                setBalanceType('demo')
                setOpen(false)
              }}
              className={`mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                balanceType === 'demo' ? 'border-teal bg-panel-light' : 'border-line hover:border-line'
              }`}
            >
              <div>
                <p className="text-sm font-semibold">Demo balance</p>
                <p className="text-xs text-muted">Practice funds</p>
              </div>
              <span className="font-semibold">${balances.demo.toFixed(2)}</span>
            </button>

            <button
              onClick={resetDemo}
              className="w-full rounded-lg bg-panel-light py-2 text-sm font-medium text-muted hover:text-text"
            >
              ↺ Reset demo to $10,000
            </button>
          </div>
        </>
      )}
    </div>
  )
}
