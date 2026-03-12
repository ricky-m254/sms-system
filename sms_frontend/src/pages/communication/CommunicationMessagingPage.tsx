import { useEffect, useRef, useState } from 'react'
import {
  MessageSquare, Plus, Send, Search, Users, Hash,
  MoreHorizontal, Circle, RefreshCw, Loader2,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Conversation = { id: number; conversation_type: string; title: string; created_at?: string }
type Message = { id: number; conversation: number; sender_name: string; content: string; sent_at: string; is_own?: boolean }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray((value as { results?: T[] }).results) ? (value as { results: T[] }).results : []
}

function fmtTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })
}

export default function CommunicationMessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = async () => {
    const res = await apiClient.get<Conversation[] | { results: Conversation[] }>('/communication/conversations/')
    const rows = asArray(res.data)
    setConversations(rows)
    if (!selected && rows.length > 0) setSelected(rows[0].id)
  }

  const loadMessages = async (id: number) => {
    const res = await apiClient.get<Message[] | { results: Message[] }>('/communication/messages/', { params: { conversation: id } })
    setMessages(asArray(res.data))
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  useEffect(() => {
    const init = async () => {
      try {
        await loadConversations()
      } catch {
        setError('Unable to load conversations.')
      }
    }
    void init()
  }, [])

  useEffect(() => {
    if (!selected) return
    void loadMessages(selected)
  }, [selected])

  const createConversation = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      await apiClient.post('/communication/conversations/', { conversation_type: 'Group', title: newTitle.trim() })
      setNewTitle('')
      setShowNew(false)
      await loadConversations()
    } catch {
      setError('Unable to create conversation.')
    } finally {
      setCreating(false)
    }
  }

  const sendMessage = async () => {
    if (!selected || !content.trim()) return
    setSending(true)
    try {
      await apiClient.post('/communication/messages/', { conversation: selected, content: content.trim() })
      setContent('')
      await loadMessages(selected)
    } catch {
      setError('Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  const filtered = conversations.filter((c) =>
    (c.title || `Conversation #${c.id}`).toLowerCase().includes(search.toLowerCase())
  )
  const activeConv = conversations.find((c) => c.id === selected)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]">
      {/* Header */}
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="In-App Conversations"
        subtitle="Manage in-app messaging and conversations"
        icon="💬"
      />

      {error && (
        <div className="flex-shrink-0 mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-amber-400 hover:text-amber-200">✕</button>
        </div>
      )}

      {/* Three-pane layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-3 md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr]">

        {/* Sidebar — Conversations */}
        <div className="flex flex-col rounded-2xl glass-panel overflow-hidden">
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="flex-1 text-sm font-semibold text-white">Conversations</h2>
              <button
                onClick={() => setShowNew(!showNew)}
                className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition"
              >
                <Plus size={13} className="text-emerald-400" />
              </button>
            </div>
            {showNew && (
              <div className="flex gap-2 mb-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void createConversation()}
                  placeholder="Group name…"
                  className="flex-1 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button onClick={createConversation} disabled={creating} className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50">
                  {creating ? <Loader2 size={11} className="animate-spin" /> : 'Go'}
                </button>
              </div>
            )}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-white/[0.07] bg-slate-950/60 pl-7 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare size={28} className="text-slate-700 mb-2" />
                <p className="text-xs text-slate-500">No conversations yet</p>
              </div>
            ) : (
              filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] hover:bg-white/[0.025] transition text-left ${selected === conv.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''}`}
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                    {conv.conversation_type === 'Group' ? <Users size={12} className="text-slate-300" /> : <Hash size={12} className="text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{conv.title || `Conversation #${conv.id}`}</p>
                    <p className="text-[10px] text-slate-500">{conv.conversation_type}</p>
                  </div>
                  {selected === conv.id && <Circle size={6} className="text-emerald-400 fill-emerald-400 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex flex-col rounded-2xl glass-panel overflow-hidden">
          {/* Thread Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07]">
            {activeConv ? (
              <>
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Users size={13} className="text-slate-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{activeConv.title || `Conversation #${activeConv.id}`}</p>
                  <p className="text-[10px] text-slate-500">{activeConv.conversation_type}</p>
                </div>
                <button
                  onClick={() => selected && void loadMessages(selected)}
                  className="h-7 w-7 rounded-lg border border-white/[0.09] flex items-center justify-center hover:bg-slate-700 transition"
                >
                  <RefreshCw size={11} className="text-slate-400" />
                </button>
                <button
                  onClick={() => alert('Message options: Archive, Mark as Read, or Delete this conversation.')}
                  className="h-7 w-7 rounded-lg border border-white/[0.09] flex items-center justify-center hover:bg-slate-700 transition"
                  title="More options"
                >
                  <MoreHorizontal size={13} className="text-slate-400" />
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a conversation</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare size={36} className="text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">Select a conversation to view messages</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare size={32} className="text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No messages yet — start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.is_own ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                    {(msg.sender_name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] ${msg.is_own ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 ${msg.is_own ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-800 border border-white/[0.09]'}`}>
                      {!msg.is_own && (
                        <p className="text-[10px] font-bold text-emerald-400 mb-1">{msg.sender_name}</p>
                      )}
                      <p className="text-xs text-slate-200 leading-relaxed">{msg.content}</p>
                    </div>
                    <p className="text-[10px] text-slate-600 px-1">{fmtTime(msg.sent_at)}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose */}
          <div className="flex-shrink-0 border-t border-white/[0.07] p-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }}
                placeholder={selected ? "Type a message… (Enter to send)" : "Select a conversation first"}
                disabled={!selected}
                rows={2}
                className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none disabled:opacity-40"
              />
              <button
                onClick={sendMessage}
                disabled={!selected || !content.trim() || sending}
                className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {sending ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
