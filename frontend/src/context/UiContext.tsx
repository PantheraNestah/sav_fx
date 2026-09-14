import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type ModalKind = 'deposit' | 'withdraw' | 'history' | null

interface UiState {
  activeModal: ModalKind
  openModal: (m: Exclude<ModalKind, null>) => void
  closeModal: () => void
  chatOpen: boolean
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
}

const UiCtx = createContext<UiState | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalKind>(null)
  const [chatOpen, setChatOpen] = useState(false)

  const value = useMemo(
    () => ({
      activeModal,
      openModal: (m: Exclude<ModalKind, null>) => setActiveModal(m),
      closeModal: () => setActiveModal(null),
      chatOpen,
      openChat: () => setChatOpen(true),
      closeChat: () => setChatOpen(false),
      toggleChat: () => setChatOpen((v) => !v),
    }),
    [activeModal, chatOpen],
  )

  return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>
}

export function useUi() {
  const ctx = useContext(UiCtx)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}
