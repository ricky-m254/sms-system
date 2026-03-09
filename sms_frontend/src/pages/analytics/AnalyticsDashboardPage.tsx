import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/auth'

type ExecutiveDashboardData = {
  kpis: {
    total_students: number
    active_enrollments: number
    total_staff: number
    attendance_rate: number
    revenue_this_month: number
    outstanding_fees: number
  }
  enrollment_by_grade: Array<{ grade: string; count: number }>
  revenue_by_month: Array<{ month: string; amount: number }>
  recent_activities: Array<{ type: string; label: string; date: string }>
}

export default function AnalyticsDashboardPage() {
  const tenantId = useAuthStore((state) => state.tenantId)
  const [data, setData] = useState<ExecutiveDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await apiClient.get<ExecutiveDashboardData>('/analytics/executive/')
        setData(response.data)
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('Access denied. You need the ANALYTICS module access.')
        } else {
          setError('Failed to load executive analytics data.')
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-slate-300">Loading executive dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-300">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-white font-sans">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Executive</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Tenant: {tenantId ?? 'public'}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Students" value={data?.kpis.total_students} />
        <KpiCard label="Active Enrollments" value={data?.kpis.active_enrollments} />
        <KpiCard label="Total Staff" value={data?.kpis.total_staff} />
        <KpiCard label="Attendance Rate" value={`${data?.kpis.attendance_rate}%`} />
        <KpiCard label="Monthly Revenue" value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(data?.kpis.revenue_this_month ?? 0)} />
        <KpiCard label="Outstanding Fees" value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(data?.kpis.outstanding_fees ?? 0)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2 font-sans">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold text-emerald-400">Enrollment by Grade</h2>
          <div className="mt-4 space-y-3">
            {data?.enrollment_by_grade.map((item) => (
              <div key={item.grade} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <span className="text-slate-300 font-sans">{item.grade}</span>
                <span className="text-lg font-semibold text-emerald-200 font-sans">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold text-emerald-400">Revenue Trend</h2>
          <div className="mt-4 space-y-3">
            {data?.revenue_by_month.map((item) => (
              <div key={item.month} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <span className="text-slate-300 font-sans">{item.month}</span>
                <span className="text-lg font-semibold text-emerald-200 font-sans">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 font-sans">
        <h2 className="text-lg font-display font-semibold text-emerald-400">Recent System Activity</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.recent_activities.map((activity, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 font-sans">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-sans">{activity.type}</p>
              <p className="mt-1 text-sm text-slate-200 font-sans">{activity.label}</p>
              <p className="mt-1 text-xs text-slate-500 font-sans">{activity.date}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 font-sans">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-sans">{label}</p>
      <p className="mt-3 text-3xl font-display font-semibold text-white font-sans">{value ?? 0}</p>
    </div>
  )
}
