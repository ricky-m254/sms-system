import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Campaign = { id: number; title: string; subject: string; status: string; created_at: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function CommunicationEmailPage() {
  const [rows, setRows] = useState<Campaign[]>([])
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [emails, setEmails] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<Campaign[] | { results: Campaign[] }>('/communication/email-campaigns/')
      setRows(asArray(response.data))
    } catch {
      setError('Unable to load campaigns.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const create = async () => {
    if (!title.trim() || !subject.trim()) return
    await apiClient.post('/communication/email-campaigns/', {
      title: title.trim(),
      subject: subject.trim(),
      body_text: body,
      sender_name: 'School',
      sender_email: 'noreply@sms.local',
    })
    setTitle('')
    setSubject('')
    setBody('')
    await load()
  }

  const send = async (id: number) => {
    const list = emails.split(',').map((v) => v.trim()).filter(Boolean)
    if (!list.length) return
    await apiClient.post(`/communication/email-campaigns/${id}/send/`, { emails: list })
    await load()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Email Manager</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Campaigns and Delivery</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Create Campaign</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Body text" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <button onClick={create} className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create</button>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Send Targets</h2>
        <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Comma-separated emails" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Campaigns</h2>
        <div className="mt-3 space-y-2 text-xs text-slate-300">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
              <div>
                <p>{row.title}</p>
                <p className="text-slate-400">{row.subject} • {row.status}</p>
              </div>
              <button onClick={() => send(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs">Send</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

