import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Key,
  Mail,
  MailCheck,
  Moon,
  Send,
  Sun,
} from 'lucide-react'
import { useTheme } from '../../context/useTheme'

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || loading) return

    setLoading(true)
    setError('')

    try {
      // Simulate account verification / reset email dispatch
      await new Promise((resolve) => setTimeout(resolve, 800))
      setSent(true)
    } catch {
      setError('We could not reach the reset service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page forgot-page">
      {/* Floating Theme Toggle */}
      <button
        type="button"
        className="auth-theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <section className="auth-card forgot-card fade-in">
        <Link to="/" className="forgot-brand" aria-label="Back to DashBinary home">
          <span>D</span>
          <b>
            Dash<span>Option</span>
          </b>
        </Link>

        <div className="forgot-icon">
          {sent ? <MailCheck size={30} /> : <Key size={30} />}
        </div>

        <p className="forgot-kicker">Account Recovery</p>
        <h1>{sent ? 'Check your inbox' : 'Reset your password'}</h1>
        <p className="auth-subtitle">
          {sent ? (
            <>
              We sent a password reset link to <strong>{email}</strong>. Follow the link to choose a new password.
            </>
          ) : (
            'Enter the email address associated with your DashBinary account.'
          )}
        </p>

        {sent ? (
          <div className="auth-success-box">
            <CheckCircle2 size={22} />
            <div>
              <b>Reset link sent</b>
              <p>It may take a few minutes to arrive. Check your spam folder too.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="reset-email">Email address</label>
            <div className="forgot-input">
              <Mail size={16} />
              <input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {error && (
              <p className="forgot-error">
                <AlertCircle size={14} /> {error}
              </p>
            )}

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? (
                'Checking account...'
              ) : (
                <>
                  <Send size={15} /> Send reset link
                </>
              )}
            </button>
          </form>
        )}

        <div className="forgot-footer">
          <Link to="/login">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
          {sent && (
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setError('')
              }}
            >
              Use a different email
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
