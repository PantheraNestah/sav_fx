import { ArrowLeft, Home, MapPinned } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-teal/30 bg-teal/10 text-teal">
          <MapPinned size={28} />
        </span>
        <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal">
          Page not found
        </p>
        <p className="mb-3 text-6xl font-extrabold text-line">404</p>
        <h1 className="mb-2 text-xl font-bold">This page is off the market.</h1>
        <p className="mb-6 text-sm text-muted">
          The address may be incorrect, or the page may have moved. You can safely return to Dash and continue
          trading.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-bg hover:brightness-110"
          >
            <ArrowLeft size={15} />
            Go back
          </button>
          <button
            onClick={() => navigate('/trade')}
            className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-teal/50"
          >
            <Home size={15} />
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
