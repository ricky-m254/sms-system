import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Summary = {
  total_messages: number
  total_notifications: number
  total_emails: number
  total_sms: number
}

export default function CommunicationDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<Summary>('/communication/analytics/summary/')
        setSummary(response.data)
      } catch {
        setError('Unable to load communication summary.')
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Communication Dashboard</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Channel Activity Overview</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Messages</p><p className="mt-2 text-2xl font-semibold">{summary?.total_messages ?? 0}</p></article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Notifications</p><p className="mt-2 text-2xl font-semibold">{summary?.total_notifications ?? 0}</p></article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Emails</p><p className="mt-2 text-2xl font-semibold">{summary?.total_emails ?? 0}</p></article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">SMS/WhatsApp</p><p className="mt-2 text-2xl font-semibold">{summary?.total_sms ?? 0}</p></article>
      </section>
    </div>
  )
}

