import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Announcement = { id: number; title: string; body: string; priority: string; audience_type: string; is_pinned: boolean }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function CommunicationAnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<Announcement[] | { results: Announcement[] }>('/communication/announcements/')
      setRows(asArray(response.data))
    } catch {
      setError('Unable to load announcements.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const create = async () => {
    if (!title.trim() || !body.trim()) return
    await apiClient.post('/communication/announcements/', {
      title: title.trim(),
      body: body.trim(),
      priority: 'Important',
      audience_type: 'All',
      notify_email: true,
      notify_sms: false,
      notify_push: false,
    })
    setTitle('')
    setBody('')
    await load()
  }

  const markRead = async (id: number) => {
    await apiClient.post(`/communication/announcements/${id}/read/`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Announcements</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Broadcasts and Audience Targeting</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Create Announcement</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Announcement content" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <button onClick={create} className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create</button>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Active Announcements</h2>
        <div className="mt-3 space-y-2 text-xs text-slate-300">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
              <div>
                <p>{row.title}</p>
                <p className="text-slate-400">{row.priority} • {row.audience_type}</p>
              </div>
              <button onClick={() => markRead(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs">Mark Read</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

