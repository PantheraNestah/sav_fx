import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { ChatWidget } from '../components/ChatWidget'
import { ToastContainer } from '../components/ToastContainer'
import { DepositModal } from '../components/modals/DepositModal'
import { HistoryModal } from '../components/modals/HistoryModal'
import { PositionDetailModal } from '../components/modals/PositionDetailModal'
import { TradeExplainerModal } from '../components/modals/TradeExplainerModal'
import { WithdrawModal } from '../components/modals/WithdrawModal'
import { useAccount } from '../context/useAccount'
import { API_ENABLED } from '../lib/api'
import { useUi } from '../context/useUi'
import { NavDrawer } from './NavDrawer'
import { TopNav } from './TopNav'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { activeModal, closeModal, chatOpen, closeChat } = useUi()
  const { activePositionDetail, closePositionDetail, isAuthenticated } = useAccount()

  // With a real backend every trading view needs a session.
  if (API_ENABLED && !isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-dvh flex-col bg-bg text-text">
      <TopNav onMenu={() => setDrawerOpen(true)} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="min-h-0 flex-1">
        <Outlet />
      </div>

      {activeModal === 'deposit' && <DepositModal onClose={closeModal} />}
      {activeModal === 'withdraw' && <WithdrawModal onClose={closeModal} />}
      {activeModal === 'history' && <HistoryModal onClose={closeModal} />}
      {activeModal === 'tradeExplainer' && <TradeExplainerModal onClose={closeModal} />}

      {activePositionDetail && (
        <PositionDetailModal position={activePositionDetail} onClose={closePositionDetail} />
      )}

      <ChatWidget open={chatOpen} onClose={closeChat} />
      <ToastContainer />
    </div>
  )
}
