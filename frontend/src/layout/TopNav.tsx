import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  History as HistoryIcon,
  Home,
  Menu,
  MessageCircle,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUi } from '../context/UiContext'
import { BalanceSelector } from './BalanceSelector'

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const { openModal, toggleChat } = useUi()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-bg px-3 sm:px-4">
      <div className="flex items-center gap-4">
        <button onClick={onMenu} className="text-muted hover:text-text xl:hidden">
          <Menu size={20} />
        </button>
        <Link to="/trade" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-bg">
            D
          </span>
          <span className="hidden font-semibold sm:inline">Dash</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted xl:flex">
          <Link to="/trade" className="flex items-center gap-1.5 hover:text-text">
            <Home size={15} />
            Trader's Hub
          </Link>
          <button onClick={() => openModal('deposit')} className="flex items-center gap-1.5 hover:text-text">
            <ArrowDownToLine size={15} />
            Deposit
          </button>
          <button onClick={() => openModal('withdraw')} className="flex items-center gap-1.5 hover:text-text">
            <ArrowUpFromLine size={15} />
            Withdraw
          </button>
          <button onClick={() => openModal('history')} className="flex items-center gap-1.5 hover:text-text">
            <HistoryIcon size={15} />
            History
          </button>
          <Link to="/copy-trading" className="flex items-center gap-1.5 hover:text-text">
            <Users size={15} />
            Copy Trading
          </Link>
          <button onClick={toggleChat} className="flex items-center gap-1.5 hover:text-text">
            <MessageCircle size={15} />
            Chat
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <BalanceSelector />
        <button className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line text-amber-400 hover:brightness-110 sm:flex">
          <Settings size={17} />
        </button>
        <button
          onClick={() => openModal('deposit')}
          className="rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-bg hover:brightness-110 sm:px-4"
        >
          Deposit
        </button>
        <button className="relative hidden h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-text sm:flex">
          <Bell size={18} />
        </button>
        <button className="hidden h-9 w-9 items-center justify-center rounded-full bg-panel-light text-muted hover:text-text sm:flex">
          <UserRound size={17} />
        </button>
      </div>
    </header>
  )
}
