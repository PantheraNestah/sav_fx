import { Check, Copy, QrCode, Shield, ShieldCheck, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../context/useToast'
import { SettingsLayout } from '../../layout/SettingsLayout'

export function TwoFactorPage() {
  const { showToast } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const SECRET_KEY = 'DASH-77XA-2FA9-QWER'

  function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 6) return

    setEnabled(true)
    setSetupMode(false)
    setCode('')
    showToast({
      title: '2FA Enabled Successfully',
      message: 'Your account is now guarded by Google Authenticator / Authy.',
      type: 'success',
    })
  }

  function handleDisable() {
    setEnabled(false)
    setSetupMode(false)
    showToast({
      title: '2FA Disabled',
      message: 'Two-factor authentication has been turned off.',
      type: 'info',
    })
  }

  function copySecret() {
    navigator.clipboard?.writeText(SECRET_KEY).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SettingsLayout>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/15 text-teal">
          <Shield size={20} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Two-Factor Authentication</h2>
          <p className="text-xs text-muted">Protect your funds with TOTP authenticator verification</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel-light p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                enabled ? 'bg-teal/20 text-teal' : 'bg-line text-muted'
              }`}
            >
              {enabled ? <ShieldCheck size={20} /> : <Smartphone size={20} />}
            </span>
            <div>
              <p className="font-bold text-sm">
                {enabled ? '2FA Status: Active & Secured' : '2FA Status: Disabled'}
              </p>
              <p className="text-xs text-muted">
                {enabled
                  ? 'Require an authenticator code whenever you log in or withdraw funds.'
                  : 'Add an extra security layer to prevent unauthorized access to your account.'}
              </p>
            </div>
          </div>

          {enabled ? (
            <button
              onClick={handleDisable}
              className="shrink-0 rounded-xl border border-red/40 px-4 py-2 text-xs font-bold text-red hover:bg-red/10 transition"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              onClick={() => setSetupMode((v) => !v)}
              className="shrink-0 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-bg hover:brightness-110 shadow"
            >
              {setupMode ? 'Cancel Setup' : 'Setup Authenticator'}
            </button>
          )}
        </div>

        {/* Setup Drawer */}
        {setupMode && !enabled && (
          <div className="mt-4 border-t border-line/60 pt-4 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow text-black">
                <QrCode size={96} />
              </div>
              <div className="space-y-2 text-xs text-muted flex-1">
                <p className="font-bold text-text text-sm">Scan QR code with your app</p>
                <p>Use Google Authenticator, Authy, or 1Password to scan the QR code to connect Dash.</p>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 font-mono text-text">
                  <span className="truncate flex-1">{SECRET_KEY}</span>
                  <button onClick={copySecret} className="text-muted hover:text-teal">
                    {copied ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">6-Digit Verification Code</span>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest outline-none focus:border-teal"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={code.length < 6}
                className="w-full rounded-xl bg-teal py-2.5 text-sm font-bold text-bg hover:brightness-110 disabled:opacity-50"
              >
                Verify & Activate 2FA
              </button>
            </form>
          </div>
        )}
      </div>
    </SettingsLayout>
  )
}

export default TwoFactorPage
