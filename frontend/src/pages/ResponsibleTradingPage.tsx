import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  Check,
  Clock,
  Compass,
  CreditCard,
  Flame,
  Heart,
  HeartPulse,
  LifeBuoy,
  LineChart,
  NotebookPen,
  Shield,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUi } from '../context/useUi'

const CHECKLIST = ['I understand the possible loss', 'I am using discretionary funds', 'I have a time and spending limit']

const HABITS = [
  { icon: Wallet, title: 'Set a budget', body: 'Decide what you can comfortably afford before every session.' },
  { icon: Clock, title: 'Take regular breaks', body: 'Stepping away helps you make calmer, more deliberate decisions.' },
  { icon: LineChart, title: 'Understand the risk', body: 'Every position can lose. Past results never guarantee future outcomes.' },
  { icon: HeartPulse, title: 'Stay in control', body: 'Avoid trading when tired, upset, rushed, or trying to recover losses.' },
]

const DO = ['Set daily and weekly trading limits', 'Keep a record of your trades', 'Practice strategies using a demo account', 'Take regular breaks from your screen']
const AVOID = ['Chasing losses with a larger stake', 'Trading with borrowed or essential money', 'Trading while emotionally distressed', 'Risking more than your planned amount']

const WARNING_SIGNS = ['Trading longer than planned', 'Trying to win losses back', 'Hiding activity', 'Feeling unable to stop']

export default function ResponsibleTradingPage() {
  const { openChat } = useUi()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/trade"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line hover:border-teal/50"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal">Account Wellbeing</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Responsible trading</h1>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-line bg-gradient-to-br from-panel to-panel-light p-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-medium text-teal">
              <Shield size={12} />
              Trade with confidence, not pressure
            </span>
            <h2 className="mb-3 text-3xl font-bold leading-tight sm:text-4xl">Keep trading a considered decision.</h2>
            <p className="mb-5 max-w-md text-sm text-muted">
              Dash is designed for informed choices. Use these practical habits to manage risk, protect your balance, and
              know when to step back.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/trade"
                className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-bg hover:brightness-110"
              >
                <LineChart size={15} />
                Return to trading
              </Link>
              <button
                onClick={openChat}
                className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-teal/50"
              >
                <LifeBuoy size={15} />
                Get support
              </button>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-xl border border-line bg-panel px-6 py-5 text-center lg:w-64">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-teal/40 bg-teal/10 text-teal">
              <Compass size={26} />
            </span>
            <p className="font-semibold">Pause. Plan. Proceed.</p>
            <p className="mt-1 text-xs text-muted">A healthy session begins with a clear limit and a clear mind.</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-line bg-panel p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/15 text-teal">
              <NotebookPen size={18} />
            </span>
            <div>
              <p className="font-semibold">Before you trade</p>
              <p className="text-xs text-muted">Take ten seconds to check in with yourself.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {CHECKLIST.map((c) => (
              <span key={c} className="flex items-center gap-2 text-sm">
                <Check size={14} className="shrink-0 text-teal" />
                {c}
              </span>
            ))}
          </div>
        </div>

        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal">Smart habits</p>
        <h3 className="mb-1 text-xl font-bold">Build a safer trading routine</h3>
        <p className="mb-4 text-sm text-muted">Small, repeatable actions can make a meaningful difference.</p>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HABITS.map((h) => (
            <div key={h.title} className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-panel-light text-teal">
                <h.icon size={18} />
              </span>
              <div>
                <p className="font-semibold">{h.title}</p>
                <p className="text-sm text-muted">{h.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-panel p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal">
              <Check size={13} />
              Do — Healthy habits
            </p>
            <div className="flex flex-col gap-2">
              {DO.map((d) => (
                <span key={d} className="flex items-center gap-2 text-sm text-muted">
                  <Check size={13} className="shrink-0 text-teal" />
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-panel p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red">
              <X size={13} />
              Avoid — Pressure decisions
            </p>
            <div className="flex flex-col gap-2">
              {[
                { icon: TrendingUp, label: AVOID[0] },
                { icon: CreditCard, label: AVOID[1] },
                { icon: Heart, label: AVOID[2] },
                { icon: Flame, label: AVOID[3] },
              ].map((a) => (
                <span key={a.label} className="flex items-center gap-2 text-sm text-muted">
                  <a.icon size={13} className="shrink-0 text-red" />
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Check in with yourself</p>
              <p className="font-semibold">Warning signs to take seriously</p>
              <p className="mt-1 text-sm text-muted">
                Consider a break or speaking to someone you trust if trading is affecting your sleep, work,
                relationships, finances, or peace of mind.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {WARNING_SIGNS.map((w) => (
              <span key={w} className="rounded-full border border-amber-500/30 px-3 py-1 text-xs text-amber-200">
                {w}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal">Support is here</p>
            <p className="mb-1 text-lg font-bold">Need help or a reset?</p>
            <p className="max-w-md text-sm text-muted">
              Our support team can help you understand account tools and point you towards independent resources.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <button
              onClick={openChat}
              className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-bg hover:brightness-110"
            >
              <LifeBuoy size={15} />
              Contact support
            </button>
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-teal/50"
            >
              BeGambleAware.org
            </a>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <Beaker size={12} />
          Demo project — this page mirrors the reference site's responsible-trading guidance; no real support line is
          connected.
        </p>
      </div>
    </div>
  )
}
