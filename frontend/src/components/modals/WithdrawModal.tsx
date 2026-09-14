import { Bitcoin, Smartphone } from 'lucide-react'
import { Modal } from './Modal'
import { MethodRow } from './DepositModal'

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Withdraw Funds" subtitle="Choose withdrawal method" onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        <MethodRow icon={<Smartphone size={18} />} iconBg="bg-teal" title="M-Pesa" subtitle="Withdraw to mobile money" />
        <MethodRow icon={<Bitcoin size={18} />} iconBg="bg-amber-500" title="USDT (TRC20)" subtitle="Withdraw to crypto wallet" />
      </div>
    </Modal>
  )
}
