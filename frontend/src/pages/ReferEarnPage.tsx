import { ArrowLeft, Check, Copy, Gift, Share2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/useToast'

const STEPS = [
  { title: 'Share your link', body: 'Send your unique referral link to fellow traders.' },
  { title: 'They sign up', body: 'Your friend creates an account and completes verification.' },
  { title: 'You both earn', body: 'Receive a $25 bonus once they complete their first continuous index trade.' },
]

const REFERRAL_CODE = 'DASH-PRO2026'

export function ReferEarnPage() {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const link = `https://dashbinary.com/join?ref=${REFERRAL_CODE}`

  function copy() {
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    showToast({
      title: 'Referral Link Copied',
      message: 'Paste and share anywhere with friends.',
      type: 'success',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: 'Trade on Dash Binary',
          text: 'Join me on Dash Binary to trade synthetic volatility indices 24/7 with zero spread!',
          url: link,
        })
        .catch(() => {})
    } else {
      copy()
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div
        className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Link
          to="/trade"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-semibold hover:border-teal/50"
        >
          <ArrowLeft size={14} />
          Back to Trade
        </Link>

        <div className="mb-6 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-transparent p-6 text-center shadow-lg">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
            <Gift size={28} />
          </span>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Refer & Earn $25 USD</h1>
          <p className="mx-auto max-w-md text-xs text-muted leading-relaxed">
            Invite friends to trade continuous volatility indices on Dash. Both of you receive a trading bonus upon their first completed contract.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">Your Unique Referral Link</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              className="flex-1 rounded-xl border border-line bg-panel-light px-3 py-2.5 text-xs font-mono text-muted outline-none truncate"
            />
            <button
              onClick={copy}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 shadow"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
              <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-xs font-bold text-violet-300">
                {i + 1}
              </span>
              <p className="font-bold text-sm">{s.title}</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-panel p-5 sm:flex-row shadow-sm">
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-panel-light text-muted">
              <Users size={20} />
            </span>
            <div>
              <span className="block font-bold text-sm">0 Friends Referred</span>
              <span className="block text-xs text-muted">$0.00 USD earned in bonuses</span>
            </div>
          </span>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-xs font-bold hover:border-teal/50 transition"
          >
            <Share2 size={14} />
            Share Invitation
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReferEarnPage
