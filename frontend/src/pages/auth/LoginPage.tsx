import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Headphones,
  Moon,
  ShieldCheck,
  Sliders,
  Sun,
  TrendingUp,
} from 'lucide-react'
import { useAccount } from '../../context/useAccount'
import { useTheme } from '../../context/useTheme'

export default function LoginPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, login } = useAccount()

  const [email, setEmail] = useState(() => localStorage.getItem('Dash_remember_email') || '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem('Dash_remember_email')))
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/trade', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }

    try {
      setLoading(true)
      const res = await login(email, password, remember)
      if (res.success) {
        navigate('/trade', { replace: true })
      } else {
        setError(res.message || 'Login failed. Please check your credentials.')
      }
    } catch {
      setError('Server error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
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

      {/* Left Column (Desktop Hero Branding & Features) */}
      <div className="auth-left fade-in">
        <h1>Welcome Back to DashBinary</h1>
        <p>Log in to access your dashboard, manage trades, and grow your portfolio.</p>

        <ul className="feature-list">
          <li>
            <span>
              <ShieldCheck size={18} />
            </span>
            Secure & encrypted platform
          </li>
          <li>
            <span>
              <TrendingUp size={18} />
            </span>
            Real-time market charts
          </li>
          <li>
            <span>
              <Sliders size={18} />
            </span>
            Advanced trading tools
          </li>
          <li>
            <span>
              <Headphones size={18} />
            </span>
            24/7 customer support
          </li>
        </ul>
      </div>

      {/* Right Column (Auth Card Form) */}
      <div className="auth-right fade-in">
        <div className="auth-card">
          <Link to="/" className="auth-home-brand" aria-label="Back to DashBinary home">
            <span>D</span>
            Dash<span>Option</span>
          </Link>

          <h2>Login</h2>
          <p>Enter your credentials to continue</p>

          {error && (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control pe-5"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between mb-5 text-sm">
              <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer text-muted select-none">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="rounded border-line bg-panel accent-teal h-4 w-4"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <Link to="/forgotpassword" className="auth-link text-xs sm:text-sm">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>
          </form>

          <p className="mt-6 mb-0 text-center text-sm text-muted">
            Don’t have an account?{' '}
            <Link to="/register" className="auth-link">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
