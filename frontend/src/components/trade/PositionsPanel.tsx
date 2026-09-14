import { Layers, X } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../context/AccountContext'

type Tab = 'open' | 'closed' | 'transactions'

export function PositionsPanel() {
  const { positions } = useAccount()
  const [tab, setTab] = useState<Tab>('open')

  const open = positions.filter((p) => p.status === 'open')
  const closed = positions.filter((p) => p.status !== 'open')
  const wins = closed.filter((p) => p.status === 'won').length
  const losses = closed.filter((p) => p.status === 'lost').length
  const sessionPl = closed.reduce((sum, p) => sum + (p.profit ?? 0), 0)

  const shown = tab === 'open' ? open : tab === 'closed' ? closed : positions

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Layers size={15} className="text-muted" />
          Positions
        </span>
        <button className="text-muted hover:text-text">
          <X size={15} />
        </button>
      </div>

      <div className="flex gap-4 border-b border-line px-3 text-sm">
        {(['open', 'closed', 'transactions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 py-2.5 capitalize transition-colors ${
              tab === t ? 'border-teal text-text' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t} {t === 'open' ? `(${open.length})` : t === 'closed' ? `(${closed.length})` : ''}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-2 text-2xl text-muted">$</span>
            <p className="text-sm font-medium">No {tab === 'transactions' ? '' : tab} positions yet</p>
            <p className="mt-1 text-xs text-muted">Your trading activity will appear here</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{p.contract}</p>
                  <p className="text-xs text-muted">{p.symbol}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      p.status === 'won' ? 'text-teal' : p.status === 'lost' ? 'text-red' : 'text-muted'
                    }`}
                  >
                    {p.status === 'open' ? 'Open' : p.profit! >= 0 ? `+${p.profit!.toFixed(2)}` : p.profit!.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted">Stake {p.stake.toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-3 py-3 text-xs">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted">Last Session</span>
          <span>
            {closed.length} trades ({wins}W / {losses}L)
          </span>
        </div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted">Session P/L:</span>
          <span className={sessionPl >= 0 ? 'text-teal' : 'text-red'}>
            {sessionPl >= 0 ? '+' : ''}
            {sessionPl.toFixed(2)} USD
          </span>
        </div>
        <p className="text-muted">{open.length} open positions</p>
      </div>
    </div>
  )
}
