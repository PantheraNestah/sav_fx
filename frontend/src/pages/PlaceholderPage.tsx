import { Link } from 'react-router-dom'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted">
        This section is a placeholder in the clone. Wire it up to the FastAPI backend when that flow is built.
      </p>
      <Link to="/trade" className="mt-2 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-bg">
        Back to Trade
      </Link>
    </div>
  )
}
