import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FlaskConical,
  LineChart,
  Moon,
  Sun,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useAccount } from '../../context/useAccount'
import { useTheme } from '../../context/useTheme'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { register } = useAccount()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setLoading(true)
      const res = await register(fullName, email, password)
      if (res.success) {
        setSuccess('Account created successfully! Redirecting to trade room...')
        setTimeout(() => {
          navigate('/trade', { replace: true })
        }, 1200)
      } else {
        setError(res.message || 'Registration failed.')
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

      {/* Left Column (Hero Features) */}
      <div className="auth-left fade-in">
        <h1>Start Your Trading Journey Today</h1>
        <p>
          Join thousands of traders who trust <strong>DashBinary</strong> for their trading needs. Access powerful tools
          and real-time data.
        </p>

        <ul className="feature-list">
          <li>
            <span>
              <FlaskConical size={18} />
            </span>
            Free demo account with $10,000 virtual funds
          </li>
          <li>
            <span>
              <LineChart size={18} />
            </span>
            Trade 100+ assets including crypto & forex
          </li>
          <li>
            <span>
              <TrendingUp size={18} />
            </span>
            Up to 95% profit on successful trades
          </li>
          <li>
            <span>
              <Zap size={18} />
            </span>
            Instant deposits and fast withdrawals
          </li>
        </ul>
      </div>

      {/* Right Column (Register Card Form) */}
      <div className="auth-right fade-in">
        <div className="auth-card">
          <Link to="/" className="auth-home-brand" aria-label="Back to DashBinary home">
            <span>D</span>
            Dash<span>Option</span>
          </Link>

          <h2>Create Account</h2>
          <p>Fill in the details to get started</p>

          {error && (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <input
                type="text"
                className="form-control"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

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
                autoComplete="new-password"
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

            <div className="auth-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-control pe-5"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="auth-btn mt-2" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <p className="mt-6 mb-0 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
