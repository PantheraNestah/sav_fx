import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'

export interface Toast {
  id: string
  title: string
  message?: string
  type: 'success' | 'error' | 'info' | 'warning'
}

export interface ToastContextState {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextState | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, type }: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, title, message, type }])

      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast],
  )

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
    }),
    [toasts, showToast, removeToast],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
