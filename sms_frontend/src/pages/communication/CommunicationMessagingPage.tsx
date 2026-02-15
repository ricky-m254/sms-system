import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Conversation = { id: number; conversation_type: string; title: string }
type Message = { id: number; conversation: number; sender_name: string; content: string; sent_at: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function CommunicationMessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<number | ''>('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadConversations = async () => {
    const response = await apiClient.get<Conversation[] | { results: Conversation[] }>('/communication/conversations/')
    const rows = asArray(response.data)
    setConversations(rows)
    if (!selectedConversation && rows.length > 0) setSelectedConversation(rows[0].id)
  }

  const loadMessages = async (conversationId: number) => {
    const response = await apiClient.get<Message[] | { results: Message[] }>('/communication/messages/', {
      params: { conversation: conversationId },
    })
    setMessages(asArray(response.data))
  }

  useEffect(() => {
    const load = async () => {
      try {
        await loadConversations()
      } catch {
        setError('Unable to load messaging data.')
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (!selectedConversation) return
    void loadMessages(Number(selectedConversation))
  }, [selectedConversation])

  const createConversation = async () => {
    try {
      await apiClient.post('/communication/conversations/', { conversation_type: 'Group', title: 'New Conversation' })
      await loadConversations()
    } catch {
      setError('Unable to create conversation.')
    }
  }

  const sendMessage = async () => {
    if (!selectedConversation || !content.trim()) return
    try {
      await apiClient.post('/communication/messages/', {
        conversation: selectedConversation,
        content: content.trim(),
      })
      setContent('')
      await loadMessages(Number(selectedConversation))
    } catch {
      setError('Unable to send message.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Messaging</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">In-App Conversations</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Conversations</h2>
            <button onClick={createConversation} className="rounded-lg border border-slate-700 px-2 py-1 text-xs">Create</button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {conversations.map((row) => (
              <button key={row.id} onClick={() => setSelectedConversation(row.id)} className={`w-full rounded-lg px-3 py-2 text-left ${selectedConversation === row.id ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-950/60 text-slate-300'}`}>
                {row.title || `Conversation #${row.id}`}
              </button>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Messages</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {messages.map((row) => (
              <div key={row.id} className="rounded-lg bg-slate-950/60 px-3 py-2">
                <p>{row.content}</p>
                <p className="text-slate-400">{row.sender_name} • {row.sent_at}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={sendMessage} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Send</button>
          </div>
        </article>
      </section>
    </div>
  )
}

