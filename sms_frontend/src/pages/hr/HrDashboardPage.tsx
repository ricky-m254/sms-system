import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type HrAnalyticsSummary = {
  headcount: number
  attendance_rate_percent: number
  departments: number
  positions: number
  headcount_by_status: Array<{ status: string; count: number }>
  headcount_by_department: Array<{ department: string; count: number }>
  headcount_by_employment_type: Array<{ employment_type: string; count: number }>
}

const emptySummary: HrAnalyticsSummary = {
  headcount: 0,
  attendance_rate_percent: 0,
  departments: 0,
  positions: 0,
  headcount_by_status: [],
  headcount_by_department: [],
  headcount_by_employment_type: [],
}

export default function HrDashboardPage() {
  const [summary, setSummary] = useState<HrAnalyticsSummary>(emptySummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const response = await apiClient.get<HrAnalyticsSummary>('/hr/analytics/summary/')
        if (isMounted) setSummary(response.data)
      } catch {
        if (isMounted) setError('Unable to load HR analytics summary.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">HR Dashboard</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Workforce Overview</h1>
        <p className="mt-2 text-sm text-slate-400">
          Headcount, attendance rate, and workforce distribution.
        </p>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Headcount</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.headcount}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {summary.attendance_rate_percent.toFixed(2)}%
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Departments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.departments}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Positions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.positions}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">By Status</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {(loading ? [] : summary.headcount_by_status).map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
                <span>{item.status}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
            {!loading && summary.headcount_by_status.length === 0 ? <p className="text-slate-500">No data</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">By Department</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {(loading ? [] : summary.headcount_by_department).map((item) => (
              <div
                key={item.department}
                className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2"
              >
                <span>{item.department}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
            {!loading && summary.headcount_by_department.length === 0 ? <p className="text-slate-500">No data</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">By Employment Type</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {(loading ? [] : summary.headcount_by_employment_type).map((item) => (
              <div
                key={item.employment_type}
                className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2"
              >
                <span>{item.employment_type}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
            {!loading && summary.headcount_by_employment_type.length === 0 ? <p className="text-slate-500">No data</p> : null}
          </div>
        </article>
      </section>
    </div>
  )
}
