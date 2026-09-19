import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Layers,
  Receipt,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../context/useAccount'

type Tab = 'open' | 'closed' | 'transactions'

export function PositionsPanel({ onClose }: { onClose?: () => void }) {
  const { positions, transactions, sessionStats, openPositionDetail } = useAccount()
  const [tab, setTab] = useState<Tab>('open')

  const open = positions.filter((p) => p.status === 'open')
  const closed = positions.filter((p) => p.status !== 'open')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Layers size={16} className="text-teal" />
          Positions & Ledger
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-panel-light hover:text-text"
            title="Close / Switch View"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-line px-3.5 text-xs font-semibold">
        {(['open', 'closed', 'transactions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 py-2.5 capitalize transition-colors ${
              tab === t ? 'border-teal text-teal' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t} {t === 'open' ? `(${open.length})` : t === 'closed' ? `(${closed.length})` : ''}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'transactions' ? (
          /* Transactions View */
          transactions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-muted">
              <span className="mb-2 text-2xl font-bold opacity-40">$</span>
              <p className="text-sm font-semibold">No transactions recorded yet</p>
              <p className="mt-1 text-xs">Deposits, payouts, and stakes will appear here</p>
            </div>
          ) : (
            <ul className="divide-y divide-line/60">
              {transactions.map((tx) => {
                const isPos = tx.amount > 0
                return (
                  <li key={tx.id} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          isPos ? 'bg-teal/15 text-teal' : 'bg-red/15 text-red'
                        }`}
                      >
                        {isPos ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      </span>
                      <div>
                        <p className="font-semibold">{tx.description}</p>
                        <p className="text-[10px] text-muted">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                          <span className="capitalize">{tx.balanceType}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${isPos ? 'text-teal' : 'text-text'}`}>
                      {isPos ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        ) : (
          /* Positions View (Open or Closed) */
          (tab === 'open' ? open : closed).length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-muted">
              <span className="mb-2 text-2xl font-bold opacity-40">$</span>
              <p className="text-sm font-semibold">No {tab} positions</p>
              <p className="mt-1 text-xs">Your trading activity will appear here</p>
            </div>
          ) : (
            <ul className="divide-y divide-line/60">
              {(tab === 'open' ? open : closed).map((p) => {
                const isWon = p.status === 'won'
                const isLost = p.status === 'lost'
                const isOpen = p.status === 'open'

                return (
                  <li
                    key={p.id}
                    onClick={() => openPositionDetail(p)}
                    className="group flex cursor-pointer items-center justify-between px-3.5 py-3 text-xs transition hover:bg-panel-light"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-text truncate">{p.contract}</span>
                        <Receipt size={12} className="text-muted opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <p className="text-[11px] text-muted truncate">{p.symbol}</p>
                      <p className="text-[10px] text-muted">
                        Stake: ${p.stake.toFixed(2)} · {new Date(p.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      {isOpen ? (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold animate-pulse">
                          <Clock size={12} className="animate-spin" /> Settling...
                        </span>
                      ) : (
                        <p
                          className={`font-mono font-bold text-sm ${
                            isWon ? 'text-teal' : isLost ? 'text-red' : 'text-muted'
                          }`}
                        >
                          {(p.profit ?? 0) >= 0 ? `+$${p.profit?.toFixed(2)}` : `-$${Math.abs(p.profit ?? 0).toFixed(2)}`}
                        </p>
                      )}
                      <span className="text-[10px] uppercase font-semibold text-muted">
                        {p.status}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        )}
      </div>

      {/* Session Metrics Bar */}
      <div className="border-t border-line/60 bg-panel-light p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted">Last Session:</span>
          <span className="font-bold">
            {sessionStats.totalTrades} trades ({sessionStats.wins}W / {sessionStats.losses}L)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Session P/L:</span>
          <span
            className={`font-bold font-mono ${
              sessionStats.sessionPl >= 0 ? 'text-teal' : 'text-red'
            }`}
          >
            {sessionStats.sessionPl >= 0 ? '+' : ''}${sessionStats.sessionPl.toFixed(2)} USD
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
          <span>{open.length} active positions</span>
          <span className="text-teal font-semibold">{sessionStats.winRate}% Win Rate</span>
        </div>
      </div>
    </div>
  )
}
