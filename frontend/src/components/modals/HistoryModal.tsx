import { ArrowDownLeft, ArrowUpRight, DollarSign, X } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../context/useAccount'

type Tab = 'all' | 'deposits' | 'withdrawals' | 'trades'

export function HistoryModal({ onClose }: { onClose: () => void }) {
  const { transactions } = useAccount()
  const [tab, setTab] = useState<Tab>('all')

  const filtered = transactions.filter((t) => {
    if (tab === 'deposits') return t.type === 'deposit'
    if (tab === 'withdrawals') return t.type === 'withdrawal'
    if (tab === 'trades') return t.type === 'stake' || t.type === 'payout'
    return true
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold">Transaction History</h2>
            <p className="text-xs text-muted">Complete audit ledger of deposits, payouts, and trades</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="my-3 flex gap-2 border-b border-line pb-2 text-xs font-semibold">
          {(['all', 'deposits', 'withdrawals', 'trades'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 capitalize transition ${
                tab === t ? 'bg-teal/15 text-teal' : 'text-muted hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {filtered.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-muted">
              <DollarSign size={28} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">No {tab !== 'all' ? tab : ''} records found</p>
              <p className="text-xs text-muted">Your trading and funding entries will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {filtered.map((tx) => {
                const isPositive = tx.amount > 0
                const timeStr = new Date(tx.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          isPositive ? 'bg-teal/15 text-teal' : 'bg-red/15 text-red'
                        }`}
                      >
                        {isPositive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{tx.description}</p>
                        <p className="text-xs text-muted">
                          {timeStr} · <span className="capitalize">{tx.balanceType}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-bold font-mono ${
                          isPositive ? 'text-teal' : 'text-text'
                        }`}
                      >
                        {isPositive ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                      </p>
                      <span className="rounded-full bg-panel-light px-2 py-0.5 text-[10px] font-semibold text-muted uppercase">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
