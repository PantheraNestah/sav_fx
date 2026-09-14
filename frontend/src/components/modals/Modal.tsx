import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-panel shadow-2xl">
        <div className="flex items-start justify-between border-b border-line p-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
