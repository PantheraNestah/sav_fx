import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AccountProvider } from './context/AccountContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { UiProvider } from './context/UiContext'
import { AppLayout } from './layout/AppLayout'
import TradePage from './pages/TradePage'

const CopyTradingPage = lazy(() => import('./pages/CopyTradingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ReferEarnPage = lazy(() => import('./pages/ReferEarnPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ResponsibleTradingPage = lazy(() => import('./pages/ResponsibleTradingPage'))
const PasswordPage = lazy(() => import('./pages/settings/PasswordPage'))
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'))
const TwoFactorPage = lazy(() => import('./pages/settings/TwoFactorPage'))
const VerifyIdentityPage = lazy(() => import('./pages/settings/VerifyIdentityPage'))

function PageFallback() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center">
      <div className="flex flex-col items-center gap-2.5">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        <span className="text-xs font-semibold text-muted">Loading view...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AccountProvider>
          <UiProvider>
            <Routes>
              {/* Standalone Authentication Views (matching dashbinary.com) */}
              <Route
                path="/login"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <LoginPage />
                  </Suspense>
                }
              />
              <Route path="/Login" element={<Navigate to="/login" replace />} />
              <Route
                path="/register"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <RegisterPage />
                  </Suspense>
                }
              />
              <Route path="/Register" element={<Navigate to="/register" replace />} />
              <Route path="/signup" element={<Navigate to="/register" replace />} />
              <Route path="/SignUp" element={<Navigate to="/register" replace />} />
              <Route
                path="/forgotpassword"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ForgotPasswordPage />
                  </Suspense>
                }
              />
              <Route path="/forgot-password" element={<Navigate to="/forgotpassword" replace />} />

              {/* Main Application with AppLayout Shell */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/trade" replace />} />
                <Route path="/trade" element={<TradePage />} />
                <Route
                  path="/copy-trading"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <CopyTradingPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/refer"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ReferEarnPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/responsible-trading"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ResponsibleTradingPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/profile"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ProfilePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/password"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <PasswordPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/2fa"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <TwoFactorPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/verify"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <VerifyIdentityPage />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <NotFoundPage />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </UiProvider>
        </AccountProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
