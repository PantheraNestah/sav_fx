import { Expand, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUi } from '../context/useUi'

export function ChatWidget({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { messages, sendMessage } = useUi()
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 sm:hidden" onClick={onClose} />
      <div
        className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-blue-400/30 bg-panel shadow-2xl transition-all inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] max-h-[80dvh] sm:bottom-4 sm:right-4 sm:left-auto sm:inset-x-auto sm:max-h-none ${
          expanded
            ? 'h-[580px] w-full sm:w-[460px] sm:max-w-[calc(100vw-2rem)]'
            : 'h-[440px] w-full sm:w-[360px] sm:max-w-[calc(100vw-2rem)]'
        }`}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <MessageCircle size={16} className="text-white" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Dash Live Support</span>
            <span className="flex items-center gap-1 text-[11px] text-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Online · Typically replies instantly
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Expand size={15} />
          </button>
          <button onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white">
            <X size={17} />
          </button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.map((m) => {
          const isUser = m.sender === 'user'
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser ? 'bg-teal text-bg font-medium rounded-br-none' : 'bg-panel-light text-text rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
              <span className="mt-1 text-[10px] text-muted">{m.time}</span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-3">
        <button
          type="button"
          onClick={() => {
            sendMessage('How do deposits and withdrawals work on Dash?')
          }}
          className="text-muted hover:text-text text-xs border border-line rounded-lg px-2 py-1 hidden sm:inline-block"
        >
          Ask about deposits
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded-lg border border-line bg-panel-light px-3 py-2 text-xs outline-none placeholder:text-muted focus:border-teal"
        />
        <button
          type="submit"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white hover:brightness-110"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
    </>
  )
}
