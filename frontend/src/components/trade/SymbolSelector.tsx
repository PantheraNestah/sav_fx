import { ChevronDown, LineChart } from 'lucide-react'
import { useState } from 'react'
import { SYMBOLS } from '../../lib/symbols'
import type { Symbol } from '../../types'

export function SymbolSelector({
  symbol,
  onChange,
  price,
  change,
  changePct,
}: {
  symbol: Symbol
  onChange: (s: Symbol) => void
  price: number
  change: number
  changePct: number
}) {
  const [open, setOpen] = useState(false)
  const up = change >= 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-full items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-left hover:border-teal/50 sm:gap-3"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/15 text-teal">
          <LineChart size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{symbol.label}</span>
          <span className="flex items-center gap-1.5 text-xs leading-tight tabular-nums">
            <span className="text-muted">{price.toFixed(2)}</span>
            <span className={`truncate ${up ? 'text-teal' : 'text-red'}`}>
              {up ? '+' : ''}
              {change.toFixed(2)} ({up ? '+' : ''}
              {changePct.toFixed(2)}%)
            </span>
          </span>
        </span>
        <ChevronDown size={14} className="ml-1 shrink-0 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 max-h-80 w-72 overflow-y-auto rounded-xl border border-line bg-panel p-1.5 shadow-xl">
            <p className="px-2.5 py-1.5 text-xs text-muted">Continuous Indices</p>
            {SYMBOLS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onChange(s)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-panel-light ${
                  s.id === symbol.id ? 'bg-panel-light text-teal' : ''
                }`}
              >
                {s.label}
                {s.id === symbol.id && <span className="h-1.5 w-1.5 rounded-full bg-teal" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
