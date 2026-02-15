import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Summary = {
  total_staff: number
  attendance_rate_percent: number
  by_staff_type: Array<{ staff_type: string; count: number }>
  by_status: Array<{ status: string; count: number }>
}

export default function StaffDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<Summary>('/staff/analytics/summary/')
        setSummary(response.data)
      } catch {
        setError('Unable to load staff summary.')
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Staff Dashboard</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Operational Overview</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Total Staff</p><p className="mt-2 text-2xl font-semibold">{summary?.total_staff ?? 0}</p></article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Attendance Rate</p><p className="mt-2 text-2xl font-semibold">{summary?.attendance_rate_percent?.toFixed(2) ?? '0.00'}%</p></article>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Staff Type Distribution</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {(summary?.by_staff_type ?? []).map((row) => (
              <div key={row.staff_type} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
                <span>{row.staff_type}</span><span>{row.count}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Status Distribution</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {(summary?.by_status ?? []).map((row) => (
              <div key={row.status} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
                <span>{row.status}</span><span>{row.count}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
