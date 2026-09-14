import { useState } from 'react'
import { Modal } from './Modal'

type Tab = 'deposits' | 'withdrawals'

export function HistoryModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('deposits')

  return (
    <Modal title="Transaction History" subtitle="Deposits and withdrawals" onClose={onClose}>
      <div className="mb-4 flex gap-5 border-b border-line text-sm">
        {(['deposits', 'withdrawals'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 pb-2.5 capitalize transition-colors ${
              tab === t ? 'border-teal text-text' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex h-32 items-center justify-center text-sm text-muted">No transactions yet</div>
    </Modal>
  )
}
