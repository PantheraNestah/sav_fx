import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  CheckCheck,
  History as HistoryIcon,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  User,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from '../context/useAccount'
import { useUi } from '../context/useUi'
import { BalanceSelector } from './BalanceSelector'

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate()
  const { openModal, toggleChat } = useUi()
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    user,
    balanceType,
    setBalanceType,
    balances,
    logout,
  } = useAccount()

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

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

        <Link
          to="/settings/profile"
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line text-amber-400 hover:brightness-110 sm:flex"
          title="Account Settings"
        >
          <Settings size={17} />
        </Link>

        <button
          onClick={() => openModal('deposit')}
          className="rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-bg hover:brightness-110 sm:px-4"
        >
          Deposit
        </button>

        {/* Notifications Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v)
              setProfileOpen(false)
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-text"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-bg">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-line bg-panel p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-teal/20 px-2 py-0.2 text-[10px] font-bold text-teal">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="flex items-center gap-1 text-[11px] text-teal hover:underline"
                    >
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`cursor-pointer rounded-xl border p-2.5 transition ${
                          n.read
                            ? 'border-transparent bg-panel-light/40 text-muted'
                            : 'border-teal/30 bg-teal/5 text-text'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-text">{n.title}</p>
                          <span className="text-[10px] text-muted">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted leading-tight">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((v) => !v)
              setNotifOpen(false)
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-light text-muted hover:text-text border border-line"
            title="User Profile"
          >
            <span className="text-xs font-bold text-teal">{user.name[0]}</span>
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-panel p-4 shadow-2xl">
                <div className="mb-3 border-b border-line pb-3">
                  <p className="font-bold text-sm">{user.name}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>

                <div className="mb-3 space-y-1.5">
                  <button
                    onClick={() => {
                      setBalanceType('real')
                      setProfileOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      balanceType === 'real' ? 'bg-teal/15 text-teal' : 'text-muted hover:bg-panel-light'
                    }`}
                  >
                    <span>Real Account</span>
                    <span>${balances.real.toFixed(2)}</span>
                  </button>

                  <button
                    onClick={() => {
                      setBalanceType('demo')
                      setProfileOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      balanceType === 'demo' ? 'bg-teal/15 text-teal' : 'text-muted hover:bg-panel-light'
                    }`}
                  >
                    <span>Demo Account</span>
                    <span>${balances.demo.toFixed(2)}</span>
                  </button>
                </div>

                <div className="border-t border-line pt-2 space-y-1">
                  <Link
                    to="/settings/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-panel-light hover:text-text"
                  >
                    <User size={14} /> Profile & KYC
                  </Link>
                  <Link
                    to="/settings/password"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-panel-light hover:text-text"
                  >
                    <Settings size={14} /> Password & Security
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      logout()
                      navigate('/login')
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
