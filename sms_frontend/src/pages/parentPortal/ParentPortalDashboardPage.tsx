import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    apiClient
      .get('/parent-portal/dashboard/')
      .then((res) => mounted && setData(res.data))
      .catch(() => mounted && setError('Unable to load parent dashboard.'))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Parent Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Real-time overview for your selected child.</p>
      </header>
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}
      {data ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Avg Grade</p><p className="mt-1 text-lg text-emerald-300">{data.kpis?.current_average_grade ?? 0}</p></article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Attendance</p><p className="mt-1 text-lg text-emerald-300">{data.kpis?.attendance_rate ?? 0}%</p></article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Outstanding</p><p className="mt-1 text-lg text-emerald-300">{data.kpis?.outstanding_fee_balance ?? 0}</p></article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Upcoming</p><p className="mt-1 text-lg text-emerald-300">{data.kpis?.upcoming_events_count ?? 0}</p></article>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold">Alerts</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(data.alerts ?? []).map((row: any, idx: number) => (
                  <li key={idx}>{row.title}</li>
                ))}
                {!data.alerts?.length ? <li className="text-slate-500">No active alerts.</li> : null}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold">Recent Activity</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(data.recent_activity ?? []).map((row: any, idx: number) => (
                  <li key={idx}>{row.type}: {row.message}</li>
                ))}
                {!data.recent_activity?.length ? <li className="text-slate-500">No activity yet.</li> : null}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

