import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Gift,
  HelpCircle,
  History,
  Home,
  LogOut,
  MessageCircle,
  Moon,
  Settings,
  Shield,
  Sun,
  Users,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from '../context/useAccount'
import { useTheme } from '../context/useTheme'
import { useUi } from '../context/useUi'

interface Props {
  open: boolean
  onClose: () => void
}

const settingsLinks = [
  { label: 'Change Name', to: '/settings/profile' },
  { label: 'Change Password', to: '/settings/password' },
  { label: 'Two Factor Auth', to: '/settings/2fa' },
  { label: 'Verify Identity', to: '/settings/verify' },
]

export function NavDrawer({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { user, logout } = useAccount()
  const { openModal, openChat } = useUi()
  const { theme, toggleTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const darkTheme = theme === 'dark'

  const handleLogout = () => {
    logout()
    onClose()
    navigate('/login')
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[340px] flex-col overflow-y-auto bg-panel transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-lg font-bold text-bg">
              {user.name[0]}
            </span>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-2">
          <DrawerItem icon={<Home size={18} />} label="Trader's Hub" to="/trade" onClick={onClose} />

          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm hover:bg-panel-light"
          >
            <span className="flex items-center gap-3">
              <Settings size={18} className="text-muted" />
              Account Settings
            </span>
            <ChevronRight size={16} className={`text-muted transition-transform ${settingsOpen ? 'rotate-90' : ''}`} />
          </button>
          {settingsOpen && (
            <div className="ml-8 flex flex-col border-l border-line pl-3">
              {settingsLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={onClose} className="py-2 text-sm text-muted hover:text-text">
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          <DrawerItem
            icon={<ArrowDownToLine size={18} />}
            label="Deposit"
            onSelect={() => openModal('deposit')}
            onClick={onClose}
          />
          <DrawerItem
            icon={<ArrowUpFromLine size={18} />}
            label="Withdraw"
            onSelect={() => openModal('withdraw')}
            onClick={onClose}
          />
          <DrawerItem
            icon={<History size={18} />}
            label="History"
            onSelect={() => openModal('history')}
            onClick={onClose}
          />
          <DrawerItem icon={<Users size={18} />} label="Copy Trading" to="/copy-trading" onClick={onClose} />
          <DrawerItem icon={<Gift size={18} />} label="Refer & Earn" to="/refer" onClick={onClose} color="text-violet-400" />

          <div className="my-2 border-t border-line" />

          <div className="flex items-center justify-between rounded-lg px-3 py-3 text-sm">
            <span className="flex items-center gap-3">
              {darkTheme ? <Moon size={18} className="text-muted" /> : <Sun size={18} className="text-muted" />}
              {darkTheme ? 'Dark Theme' : 'Light Theme'}
            </span>
            <button
              onClick={toggleTheme}
              className={`h-6 w-11 rounded-full transition-colors ${darkTheme ? 'bg-teal' : 'bg-line'}`}
            >
              <span
                className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
                  darkTheme ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <DrawerItem icon={<HelpCircle size={18} />} label="Help Centre" onSelect={openChat} onClick={onClose} />
          <DrawerItem icon={<Shield size={18} />} label="Responsible Trading" to="/responsible-trading" onClick={onClose} />
          <DrawerItem icon={<MessageCircle size={18} />} label="Live Chat" onSelect={openChat} onClick={onClose} />

          <div className="my-2 border-t border-line" />
          <DrawerItem icon={<LogOut size={18} />} label="Logout" onClick={handleLogout} danger />
        </nav>
      </aside>
    </>
  )
}

function DrawerItem({
  icon,
  label,
  to,
  onSelect,
  onClick,
  color,
  danger,
}: {
  icon: ReactNode
  label: string
  to?: string
  onSelect?: () => void
  onClick?: () => void
  color?: string
  danger?: boolean
}) {
  const cls = `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-panel-light ${
    danger ? 'text-red' : (color ?? '')
  }`
  const content = (
    <>
      <span className={danger ? 'text-red' : (color ?? 'text-muted')}>{icon}</span>
      {label}
    </>
  )
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls}>
        {content}
      </Link>
    )
  }
  return (
    <button
      onClick={() => {
        onSelect?.()
        onClick?.()
      }}
      className={cls}
    >
      {content}
    </button>
  )
}
