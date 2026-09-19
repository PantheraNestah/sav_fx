import { Check, Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../context/useToast'
import { SettingsLayout } from '../../layout/SettingsLayout'

const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
]

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      <span className="relative block">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-line bg-panel-light px-3 py-2.5 pr-10 text-sm font-semibold outline-none placeholder:text-muted focus:border-teal"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  )
}

export function PasswordPage() {
  const { showToast } = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const passed = RULES.filter((r) => r.test(next)).length
  const strength = next.length === 0 ? '' : passed <= 1 ? 'Weak' : passed <= 3 ? 'Fair' : 'Strong'
  const strengthColor = strength === 'Strong' ? 'bg-teal' : strength === 'Fair' ? 'bg-amber-400' : 'bg-red'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!current) {
      setError('Please enter your current password.')
      return
    }

    if (passed < 3) {
      setError('New password does not meet required security standards.')
      return
    }

    if (next !== confirm) {
      setError('Confirmation password does not match new password.')
      return
    }

    showToast({
      title: 'Password Changed Successfully',
      message: 'Your account security credentials have been updated.',
      type: 'success',
    })

    setCurrent('')
    setNext('')
    setConfirm('')
  }

  return (
    <SettingsLayout>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Lock size={18} className="text-teal" />
        Change Password
      </h2>
      <p className="mb-6 text-xs text-muted">Protect your account with a strong, distinct password.</p>

      {error && (
        <div className="mb-4 rounded-xl border border-red/40 bg-red/10 p-3 text-xs font-semibold text-red">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <PasswordField
          label="Current Password"
          placeholder="Enter current password"
          value={current}
          onChange={setCurrent}
        />
        <PasswordField
          label="New Password"
          placeholder="Create strong password"
          value={next}
          onChange={setNext}
        />

        <button
          type="button"
          onClick={() => {
            const pwd = generatePassword()
            setNext(pwd)
            setConfirm(pwd)
          }}
          className="mb-4 flex items-center gap-2 rounded-lg border border-teal/40 px-3 py-2 text-xs font-bold text-teal hover:bg-teal/10"
        >
          <KeyRound size={14} />
          Generate Secure Password
        </button>

        {next.length > 0 && (
          <div className="mb-4 rounded-xl border border-line bg-panel-light p-3">
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full transition-all ${strengthColor}`}
                style={{ width: `${(passed / 4) * 100}%` }}
              />
            </div>
            <p className="mb-2 text-xs text-muted">
              Strength: <span className="font-bold text-text">{strength}</span>
            </p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {RULES.map((r) => {
                const ok = r.test(next)
                return (
                  <span key={r.key} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-teal' : 'text-muted'}`}>
                    {ok ? <Check size={12} /> : <X size={12} />}
                    {r.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <PasswordField
          label="Confirm New Password"
          placeholder="Confirm password"
          value={confirm}
          onChange={setConfirm}
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-teal-dark to-teal py-2.5 text-sm font-bold text-bg hover:brightness-110 shadow-lg shadow-teal/20"
        >
          Update Password
        </button>
      </form>
    </SettingsLayout>
  )
}

export default PasswordPage
