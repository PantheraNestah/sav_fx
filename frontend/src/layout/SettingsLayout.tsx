import { ArrowLeft, Settings, Shield, SmartphoneNfc, User, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { label: 'Profile', to: '/settings/profile', icon: User },
  { label: 'Password', to: '/settings/password', icon: Lock },
  { label: 'Two-Factor Auth', to: '/settings/2fa', icon: SmartphoneNfc },
  { label: 'Verify Identity', to: '/settings/verify', icon: Shield },
]

export function SettingsLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="h-full overflow-y-auto">
      <div
        className="mx-auto max-w-4xl px-4 py-6 sm:px-6"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            to="/trade"
            className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-teal/50"
          >
            <ArrowLeft size={15} />
            Back to Trade
          </Link>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/15 text-teal">
            <Settings size={18} />
          </span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Account Settings</h1>
          </div>
          <span className="hidden text-sm text-muted sm:inline">Manage your profile, access and verification</span>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          <aside className="shrink-0 rounded-xl border border-line bg-panel p-3 sm:w-64">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">Account Center</p>
            <nav className="flex flex-row gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:flex-col sm:overflow-visible">
              {NAV.map((item) => {
                const active = pathname === item.to
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'border border-teal/40 bg-teal/10 text-teal' : 'text-muted hover:bg-panel-light hover:text-text'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 rounded-xl border border-line bg-panel p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
