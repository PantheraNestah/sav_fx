import { ChevronRight, Layers, LineChart as ChartIcon } from 'lucide-react'
import { useState } from 'react'
import { ChartPanel } from '../components/trade/ChartPanel'
import { PositionsPanel } from '../components/trade/PositionsPanel'
import { TradePanel } from '../components/trade/TradePanel'
import { DEFAULT_SYMBOL } from '../lib/symbols'
import type { Symbol } from '../types'

type MobileView = 'trade' | 'positions'

export default function TradePage() {
  const [symbol, setSymbol] = useState<Symbol>(DEFAULT_SYMBOL)
  const [mobileView, setMobileView] = useState<MobileView>('trade')
  const [positionsExpanded, setPositionsExpanded] = useState(true)

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        {/* Positions Column */}
        <div
          className={`${
            mobileView === 'positions' ? 'flex' : 'hidden'
          } min-h-0 flex-1 flex-col xl:flex xl:flex-none xl:border-r xl:border-line transition-all duration-200 ${
            positionsExpanded ? 'xl:w-[310px]' : 'xl:w-0 xl:overflow-hidden'
          }`}
        >
          <PositionsPanel onClose={() => {
            if (window.innerWidth >= 1280) {
              setPositionsExpanded(false)
            } else {
              setMobileView('trade')
            }
          }} />
        </div>

        {/* Collapsed Positions Dock Button (Desktop) */}
        {!positionsExpanded && (
          <div className="hidden xl:flex flex-col items-center border-r border-line bg-panel py-3 px-1">
            <button
              onClick={() => setPositionsExpanded(true)}
              className="flex flex-col items-center gap-2 rounded-lg p-1.5 text-muted hover:bg-panel-light hover:text-teal transition"
              title="Expand Positions Panel"
            >
              <ChevronRight size={16} />
              <span className="[writing-mode:vertical-lr] text-xs font-bold tracking-wider uppercase rotate-180 text-muted">
                Positions
              </span>
            </button>
          </div>
        )}

        {/* Chart & Trade Panel Column */}
        <div
          className={`${
            mobileView === 'trade' ? 'flex' : 'hidden'
          } min-h-0 flex-1 flex-col overflow-y-auto xl:flex xl:flex-row xl:overflow-visible`}
        >
          <div className="h-[350px] shrink-0 xs:h-[385px] xl:h-auto xl:min-h-0 xl:flex-1 xl:border-r xl:border-line">
            <ChartPanel symbol={symbol} onSymbolChange={setSymbol} />
          </div>
          <div className="shrink-0 border-t border-line xl:min-h-0 xl:w-[380px] xl:flex-none xl:border-t-0">
            <TradePanel symbol={symbol} />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Switcher */}
      <nav
        className="flex shrink-0 border-t border-line bg-panel xl:hidden shadow-lg"
        style={{ paddingBottom: 'calc(0.35rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={() => setMobileView('trade')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition active:opacity-75 ${
            mobileView === 'trade' ? 'text-teal border-t-2 border-teal' : 'text-muted'
          }`}
        >
          <ChartIcon size={18} />
          Trade
        </button>
        <button
          onClick={() => setMobileView('positions')}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold transition ${
            mobileView === 'positions' ? 'text-teal border-t-2 border-teal' : 'text-muted'
          }`}
        >
          <Layers size={18} />
          Positions & Activity
        </button>
      </nav>
    </div>
  )
}
