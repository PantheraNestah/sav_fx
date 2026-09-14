import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ChatWidget } from '../components/ChatWidget'
import { DepositModal } from '../components/modals/DepositModal'
import { HistoryModal } from '../components/modals/HistoryModal'
import { WithdrawModal } from '../components/modals/WithdrawModal'
import { useUi } from '../context/UiContext'
import { NavDrawer } from './NavDrawer'
import { TopNav } from './TopNav'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { activeModal, closeModal, chatOpen, closeChat } = useUi()

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
      <ChatWidget open={chatOpen} onClose={closeChat} />
    </div>
  )
}
