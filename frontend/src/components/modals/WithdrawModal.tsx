import {
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Smartphone,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../context/useAccount'

type WithdrawMethod = 'mpesa' | 'crypto' | null

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  const { balances, withdraw } = useAccount()
  const [method, setMethod] = useState<WithdrawMethod>(null)
  const [amount, setAmount] = useState<number>(balances.real > 10 ? 25 : 10)
  const [destination, setDestination] = useState('0712345678')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount < 10 || amount > balances.real) return

    setIsProcessing(true)
    setTimeout(() => {
      const ok = withdraw(amount, method === 'mpesa' ? 'M-Pesa' : 'USDT TRC20', destination)
      setIsProcessing(false)
      if (ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1800)
      }
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            {method && !isProcessing && !isSuccess && (
              <button
                onClick={() => setMethod(null)}
                className="mr-1 rounded-lg p-1 text-muted hover:bg-panel-light hover:text-text"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold">
                {isSuccess
                  ? 'Withdrawal Dispatched'
                  : method === 'mpesa'
                    ? 'Withdraw via M-Pesa'
                    : method === 'crypto'
                      ? 'Withdraw via USDT TRC20'
                      : 'Withdraw Funds'}
              </h2>
              <p className="text-xs text-muted">
                Available Real Balance: <span className="font-semibold text-teal">${balances.real.toFixed(2)} USD</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        {/* Success State */}
        {isSuccess && (
          <div className="py-8 text-center animate-in zoom-in-95">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal/20 text-teal">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-text">${amount.toFixed(2)} USD Transferred</h3>
            <p className="mt-1 text-xs text-muted">Payment dispatched to {destination}.</p>
          </div>
        )}

        {/* Method Picker */}
        {!method && !isSuccess && (
          <div className="mt-4 space-y-2.5">
            {balances.real < 10 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                Minimum withdrawal threshold is $10.00 USD. Your current real balance is ${balances.real.toFixed(2)}.
              </div>
            )}

            <button
              onClick={() => {
                setMethod('mpesa')
                setDestination('0712345678')
              }}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-panel-light p-3.5 text-left transition hover:border-teal/50 hover:bg-panel"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal text-bg">
                  <Smartphone size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">M-Pesa B2C Transfer</span>
                  <span className="block text-xs text-muted">Direct to Safaricom mobile money (KES)</span>
                </span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>

            <button
              onClick={() => {
                setMethod('crypto')
                setDestination('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
              }}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-panel-light p-3.5 text-left transition hover:border-teal/50 hover:bg-panel"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Bitcoin size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">USDT (TRC20)</span>
                  <span className="block text-xs text-muted">Fast crypto payout to any TRON address</span>
                </span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>
          </div>
        )}

        {/* Form view */}
        {method && !isSuccess && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {isProcessing ? (
              <div className="py-8 text-center">
                <Loader2 size={36} className="mx-auto mb-3 animate-spin text-teal" />
                <h4 className="font-bold">Broadcasting Payout Request...</h4>
                <p className="mt-1 text-xs text-muted">Contacting disbursement gateway for automated release.</p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted">Withdrawal Amount ($ USD)</label>
                    <button
                      type="button"
                      onClick={() => setAmount(Math.max(10, Math.floor(balances.real)))}
                      className="text-xs text-teal hover:underline font-semibold"
                    >
                      Max (${balances.real.toFixed(2)})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="10"
                    max={balances.real}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    {method === 'mpesa' ? 'Recipient M-Pesa Phone Number' : 'Destination TRON (TRC20) Address'}
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-semibold outline-none focus:border-teal font-mono"
                    required
                  />
                </div>

                <div className="rounded-xl border border-line/60 bg-panel-light p-3 text-xs space-y-1 text-muted">
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span className="text-teal font-bold">0.00 USD (Free)</span>
                  </div>
                  <div className="flex justify-between font-semibold text-text">
                    <span>Total Payout to Receive</span>
                    <span>${amount.toFixed(2)} USD</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={amount < 10 || amount > balances.real}
                  className={`w-full rounded-xl py-2.5 text-sm font-bold text-bg transition ${
                    amount < 10 || amount > balances.real
                      ? 'bg-panel-light text-muted cursor-not-allowed'
                      : 'bg-teal hover:brightness-110'
                  }`}
                >
                  Confirm Withdrawal
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
