import { Expand, ImagePlus, MessageCircle, Send, X } from 'lucide-react'
import { useState } from 'react'

export function ChatWidget({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('')

  if (!open) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[420px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-blue-400/30 bg-panel shadow-2xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <MessageCircle size={16} className="text-white" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Live Support</span>
            <span className="flex items-center gap-1 text-xs text-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Online · Typically replies instantly
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1">
          <button className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white">
            <Expand size={16} />
          </button>
          <button onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 text-sm text-muted">
        Chat is a demo widget — this project doesn't connect to a real support backend.
      </div>

      <div className="flex items-center gap-2 border-t border-line p-3">
        <button className="text-muted hover:text-text">
          <ImagePlus size={20} />
        </button>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-line bg-panel-light px-3 py-2 text-sm outline-none placeholder:text-muted"
        />
        <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white hover:brightness-110">
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
