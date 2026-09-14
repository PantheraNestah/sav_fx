import { Navigate, Route, Routes } from 'react-router-dom'
import { AccountProvider } from './context/AccountContext'
import { UiProvider } from './context/UiContext'
import { AppLayout } from './layout/AppLayout'
import CopyTradingPage from './pages/CopyTradingPage'
import PlaceholderPage from './pages/PlaceholderPage'
import TradePage from './pages/TradePage'

export default function App() {
  return (
    <AccountProvider>
      <UiProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/trade" replace />} />
            <Route path="/trade" element={<TradePage />} />
            <Route path="/copy-trading" element={<CopyTradingPage />} />
            <Route path="/refer" element={<PlaceholderPage title="Refer & Earn" />} />
            <Route path="/help" element={<PlaceholderPage title="Help Centre" />} />
            <Route path="/responsible-trading" element={<PlaceholderPage title="Responsible Trading" />} />
            <Route path="/settings/profile" element={<PlaceholderPage title="Change Name" />} />
            <Route path="/settings/password" element={<PlaceholderPage title="Change Password" />} />
            <Route path="/settings/2fa" element={<PlaceholderPage title="Two Factor Auth" />} />
            <Route path="/settings/verify" element={<PlaceholderPage title="Verify Identity" />} />
            <Route path="*" element={<Navigate to="/trade" replace />} />
          </Route>
        </Routes>
      </UiProvider>
    </AccountProvider>
  )
}
