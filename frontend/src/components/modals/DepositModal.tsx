import { Bitcoin, ChevronRight, CreditCard, Smartphone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Modal } from './Modal'

export function MethodRow({
  icon,
  iconBg,
  iconColor = 'text-bg',
  title,
  subtitle,
}: {
  icon: ReactNode
  iconBg: string
  iconColor?: string
  title: string
  subtitle: string
}) {
  return (
    <button className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3.5 text-left transition-colors hover:border-teal/50 hover:bg-panel-light">
      <span className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor} ${iconBg}`}>{icon}</span>
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted">{subtitle}</span>
        </span>
      </span>
      <ChevronRight size={18} className="text-muted" />
    </button>
  )
}

export function DepositModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Deposit Funds" subtitle="Choose payment method" onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        <MethodRow icon={<Smartphone size={18} />} iconBg="bg-teal" title="M-Pesa" subtitle="Instant mobile money" />
        <MethodRow
          icon={<CreditCard size={18} />}
          iconBg="bg-line"
          iconColor="text-text"
          title="Credit/Debit Card"
          subtitle="Visa, Mastercard"
        />
        <MethodRow icon={<Bitcoin size={18} />} iconBg="bg-amber-500" title="USDT (TRC20)" subtitle="Cryptocurrency" />
      </div>
    </Modal>
  )
}
