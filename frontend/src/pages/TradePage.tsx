import { LineChart as ChartIcon, Layers } from 'lucide-react'
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <div
          className={`${
            mobileView === 'positions' ? 'flex' : 'hidden'
          } min-h-0 flex-1 flex-col xl:flex xl:w-[300px] xl:flex-none xl:border-r xl:border-line`}
        >
          <PositionsPanel />
        </div>

        <div
          className={`${
            mobileView === 'trade' ? 'flex' : 'hidden'
          } min-h-0 flex-1 flex-col overflow-y-auto xl:flex xl:flex-row xl:overflow-visible`}
        >
          <div className="h-[300px] shrink-0 xs:h-[340px] xl:h-auto xl:min-h-0 xl:flex-1 xl:border-r xl:border-line">
            <ChartPanel symbol={symbol} onSymbolChange={setSymbol} />
          </div>
          <div className="shrink-0 border-t border-line xl:min-h-0 xl:w-[380px] xl:flex-none xl:border-t-0">
            <TradePanel symbol={symbol} />
          </div>
        </div>
      </div>

      <nav className="flex shrink-0 border-t border-line bg-bg xl:hidden">
        <button
          onClick={() => setMobileView('trade')}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
            mobileView === 'trade' ? 'text-teal' : 'text-muted'
          }`}
        >
          <ChartIcon size={18} />
          Trade
        </button>
        <button
          onClick={() => setMobileView('positions')}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
            mobileView === 'positions' ? 'text-teal' : 'text-muted'
          }`}
        >
          <Layers size={18} />
          Positions
        </button>
      </nav>
    </div>
  )
}
