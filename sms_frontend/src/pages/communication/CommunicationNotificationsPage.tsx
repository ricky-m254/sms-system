import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type NotificationRow = { id: number; title: string; message: string; is_read: boolean; sent_at: string; notification_type: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function CommunicationNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<NotificationRow[] | { results: NotificationRow[] }>('/communication/notifications/')
      setRows(asArray(response.data))
    } catch {
      setError('Unable to load notifications.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const create = async () => {
    if (!title.trim() || !message.trim()) return
    try {
      await apiClient.post('/communication/notifications/', {
        recipient: 1,
        notification_type: 'System',
        title: title.trim(),
        message: message.trim(),
      })
      setTitle('')
      setMessage('')
      await load()
    } catch {
      setError('Unable to create notification.')
    }
  }

  const markRead = async (id: number) => {
    await apiClient.patch(`/communication/notifications/${id}/read/`)
    await load()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Notifications</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Alerts and Notification Center</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Create Notification</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:col-span-2" />
        </div>
        <button onClick={create} className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create</button>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">My Notifications</h2>
        <div className="mt-3 space-y-2 text-xs text-slate-300">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
              <div>
                <p>{row.title}</p>
                <p className="text-slate-400">{row.message}</p>
              </div>
              {!row.is_read ? <button onClick={() => markRead(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs">Read</button> : <span className="text-emerald-200">Read</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

