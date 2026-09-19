import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToast } from '../context/useToast'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success'
        const isError = t.type === 'error'
        const isWarning = t.type === 'warning'

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 ${
              isSuccess
                ? 'border-teal/40 bg-panel/95 text-text'
                : isError
                  ? 'border-red/40 bg-panel/95 text-text'
                  : isWarning
                    ? 'border-amber-400/40 bg-panel/95 text-text'
                    : 'border-blue-400/40 bg-panel/95 text-text'
            }`}
          >
            <span className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 size={18} className="text-teal" />}
              {isError && <XCircle size={18} className="text-red" />}
              {isWarning && <AlertCircle size={18} className="text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info size={18} className="text-blue-400" />}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs text-muted leading-tight">{t.message}</p>}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-muted hover:text-text p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
