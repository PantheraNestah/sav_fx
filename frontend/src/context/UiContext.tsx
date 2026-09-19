import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'

export type ModalKind = 'deposit' | 'withdraw' | 'history' | 'aiScanner' | 'tradeExplainer' | null

export interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  text: string
  time: string
}

export interface UiState {
  activeModal: ModalKind
  openModal: (m: Exclude<ModalKind, null>) => void
  closeModal: () => void
  chatOpen: boolean
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  messages: ChatMessage[]
  sendMessage: (text: string) => void
}

export const UiCtx = createContext<UiState | null>(null)

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    sender: 'agent',
    text: 'Hello! Welcome to Dash Binary Support. How can we help you with trading, deposits, or contract types today?',
    time: 'Just now',
  },
]

export function UiProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalKind>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text.trim(),
      time: now,
    }

    setMessages((prev) => [...prev, userMsg])

    // Provide intelligent simulated agent replies based on query
    setTimeout(() => {
      const lower = text.toLowerCase()
      let reply = "Our demo platform simulates high-frequency volatility index trading with 24/7 continuous market data."

      if (lower.includes('deposit') || lower.includes('m-pesa') || lower.includes('mpesa')) {
        reply = "You can simulate an instant M-Pesa STK Push deposit by clicking 'Deposit' in the top bar. Enter your Safaricom mobile number to credit funds."
      } else if (lower.includes('withdraw')) {
        reply = "Withdrawals on Dash are processed to mobile money (M-Pesa) or USDT TRC20 wallets. Standard processing takes 5-15 minutes."
      } else if (lower.includes('even') || lower.includes('odd') || lower.includes('contract')) {
        reply = "Even/Odd contracts resolve on the last decimal digit of the tick. If the last digit is [0, 2, 4, 6, 8], Even wins with ~90.6% payout."
      } else if (lower.includes('matches') || lower.includes('differs')) {
        reply = "Matches/Differs lets you predict the exact last digit. Matching pays ~857.7% (+8.5x), while Differs pays ~10.59%."
      } else if (lower.includes('auto') || lower.includes('bot')) {
        reply = "Auto-trading uses your Target Profit, Target Loss, and Loss Multiple (Martingale) to place consecutive trades automatically until targets are reached."
      }

      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, agentMsg])
    }, 700)
  }, [])

  const value = useMemo(
    () => ({
      activeModal,
      openModal: (m: Exclude<ModalKind, null>) => setActiveModal(m),
      closeModal: () => setActiveModal(null),
      chatOpen,
      openChat: () => setChatOpen(true),
      closeChat: () => setChatOpen(false),
      toggleChat: () => setChatOpen((v) => !v),
      messages,
      sendMessage,
    }),
    [activeModal, chatOpen, messages, sendMessage],
  )

  return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>
}
