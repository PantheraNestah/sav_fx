import {
  ArrowLeft,
  Bitcoin,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  Smartphone,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../../context/useAccount'

type DepositMethod = 'mpesa' | 'card' | 'crypto' | null

export function DepositModal({ onClose }: { onClose: () => void }) {
  const { deposit } = useAccount()
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod>(null)
  const [amount, setAmount] = useState(50)
  const [phone, setPhone] = useState('0712345678')
  const [cardNo, setCardNo] = useState('4242 •••• •••• 4242')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const USDT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

  function handleMpesaSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) return
    setIsProcessing(true)

    // Simulate STK push prompt and network settlement
    setTimeout(() => {
      setIsProcessing(false)
      setIsSuccess(true)
      deposit(amount, 'M-Pesa STK Push')
      setTimeout(() => {
        onClose()
      }, 1800)
    }, 2800)
  }

  function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) return
    setIsProcessing(true)

    setTimeout(() => {
      setIsProcessing(false)
      setIsSuccess(true)
      deposit(amount, 'Card (Visa/Mastercard)')
      setTimeout(() => {
        onClose()
      }, 1800)
    }, 2000)
  }

  function handleCryptoSimulate() {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setIsSuccess(true)
      deposit(100, 'USDT (TRC20)')
      setTimeout(() => {
        onClose()
      }, 1800)
    }, 1500)
  }

  function copyAddress() {
    navigator.clipboard?.writeText(USDT_ADDRESS).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            {selectedMethod && !isProcessing && !isSuccess && (
              <button
                onClick={() => setSelectedMethod(null)}
                className="mr-1 rounded-lg p-1 text-muted hover:bg-panel-light hover:text-text"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold">
                {isSuccess
                  ? 'Deposit Successful'
                  : selectedMethod === 'mpesa'
                    ? 'M-Pesa STK Deposit'
                    : selectedMethod === 'card'
                      ? 'Card Checkout'
                      : selectedMethod === 'crypto'
                        ? 'USDT TRC20 Deposit'
                        : 'Deposit Funds'}
              </h2>
              <p className="text-xs text-muted">
                {isSuccess
                  ? 'Funds added to real balance'
                  : selectedMethod
                    ? 'Complete payment simulation'
                    : 'Select instant funding method'}
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
            <h3 className="text-xl font-bold text-text">${amount.toFixed(2)} USD Added</h3>
            <p className="mt-1 text-xs text-muted">Your real balance has been credited successfully.</p>
          </div>
        )}

        {/* Method Selection Screen */}
        {!selectedMethod && !isSuccess && (
          <div className="mt-4 space-y-2.5">
            <button
              onClick={() => setSelectedMethod('mpesa')}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-panel-light p-3.5 text-left transition hover:border-teal/50 hover:bg-panel"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal text-bg">
                  <Smartphone size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">M-Pesa STK Push</span>
                  <span className="block text-xs text-muted">Instant Safaricom mobile prompt (KES)</span>
                </span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>

            <button
              onClick={() => setSelectedMethod('card')}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-panel-light p-3.5 text-left transition hover:border-teal/50 hover:bg-panel"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                  <CreditCard size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Credit / Debit Card</span>
                  <span className="block text-xs text-muted">Visa, Mastercard, Maestro</span>
                </span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>

            <button
              onClick={() => setSelectedMethod('crypto')}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-panel-light p-3.5 text-left transition hover:border-teal/50 hover:bg-panel"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Bitcoin size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">USDT (TRC20)</span>
                  <span className="block text-xs text-muted">Tron blockchain deposit address</span>
                </span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>
          </div>
        )}

        {/* M-Pesa Interactive Form */}
        {selectedMethod === 'mpesa' && !isSuccess && (
          <form onSubmit={handleMpesaSubmit} className="mt-4 space-y-4">
            {isProcessing ? (
              <div className="py-8 text-center">
                <Loader2 size={36} className="mx-auto mb-3 animate-spin text-teal" />
                <h4 className="font-bold">Waiting for M-Pesa PIN...</h4>
                <p className="mt-1 text-xs text-muted">
                  A payment prompt has been sent to {phone}. Enter your M-Pesa PIN on your phone to complete deposit.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Safaricom Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712345678"
                    className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Amount (USD)</label>
                  <input
                    type="number"
                    min="5"
                    max="5000"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                    required
                  />
                  <p className="mt-1 text-right text-[11px] text-muted">
                    Approx. {(amount * 130).toLocaleString()} KES (Rate 1 USD = 130 KES)
                  </p>
                </div>

                <div className="flex gap-2">
                  {[10, 25, 50, 100, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
                        amount === val ? 'border-teal bg-teal/10 text-teal' : 'border-line text-muted hover:text-text'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal py-2.5 text-sm font-bold text-bg hover:brightness-110"
                >
                  Send M-Pesa STK Push
                </button>
              </>
            )}
          </form>
        )}

        {/* Card Interactive Form */}
        {selectedMethod === 'card' && !isSuccess && (
          <form onSubmit={handleCardSubmit} className="mt-4 space-y-4">
            {isProcessing ? (
              <div className="py-8 text-center">
                <Loader2 size={36} className="mx-auto mb-3 animate-spin text-teal" />
                <h4 className="font-bold">Authorizing 3D Secure...</h4>
                <p className="mt-1 text-xs text-muted">Contacting issuing bank for payment clearance.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Card Number</label>
                  <input
                    type="text"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value)}
                    className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-mono font-semibold outline-none focus:border-teal"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted">Expiry</label>
                    <input
                      defaultValue="08/28"
                      className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted">CVC</label>
                    <input
                      defaultValue="888"
                      type="password"
                      maxLength={4}
                      className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Deposit Amount ($ USD)</label>
                  <input
                    type="number"
                    min="10"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-panel-light px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-bold text-white hover:brightness-110"
                >
                  Pay ${amount.toFixed(2)} USD
                </button>
              </>
            )}
          </form>
        )}

        {/* Crypto TRC20 Screen */}
        {selectedMethod === 'crypto' && !isSuccess && (
          <div className="mt-4 space-y-4">
            {isProcessing ? (
              <div className="py-8 text-center">
                <Loader2 size={36} className="mx-auto mb-3 animate-spin text-amber-500" />
                <h4 className="font-bold">Detecting Blockchain Deposit...</h4>
                <p className="mt-1 text-xs text-muted">Waiting for TRON 12 block confirmations.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-panel-light p-4 text-center">
                  <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-lg border border-line bg-white text-black">
                    <QrCode size={72} />
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-400">
                    TRON Network (TRC20)
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Deposit Address</label>
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-panel-light px-3 py-2 font-mono text-xs text-text">
                    <span className="truncate flex-1">{USDT_ADDRESS}</span>
                    <button onClick={copyAddress} className="text-muted hover:text-teal">
                      {copied ? <Check size={15} className="text-teal" /> : <Copy size={15} />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-red">Send only USDT TRC20 to this address. Minimum: $10 USDT.</p>
                </div>

                <button
                  type="button"
                  onClick={handleCryptoSimulate}
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:brightness-110"
                >
                  Simulate Receiving $100 USDT
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
