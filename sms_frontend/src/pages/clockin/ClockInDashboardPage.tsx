import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type DashboardData = {
  students_in: number
  students_late: number
  staff_in: number
  staff_late: number
  recent_events: Array<{
    id: number
    person_name: string
    person_type: string
    event_type: 'IN' | 'OUT'
    timestamp: string
    is_late: boolean
  }>
}

type RealtimeData = {
  name: string
  role: string
  person_type: string
  time_in: string
}

export default function ClockInDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    students_in: 0,
    students_late: 0,
    staff_in: 0,
    staff_late: 0,
    recent_events: [],
  })
  const [realtime, setRealtime] = useState<RealtimeData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [dashRes, realRes] = await Promise.all([
        apiClient.get<DashboardData>('/clockin/dashboard/'),
        apiClient.get<RealtimeData[]>('/clockin/realtime/'),
      ])
      setData(dashRes.data)
      setRealtime(realRes.data)
      setError(null)
    } catch {
      setError('Clock-In dashboard data unavailable.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = [
    { label: 'Students In Today', value: data.students_in, tone: 'text-emerald-400' },
    { label: 'Students Late', value: data.students_late, tone: 'text-amber-400' },
    { label: 'Staff In Today', value: data.staff_in, tone: 'text-emerald-400' },
    { label: 'Staff Late', value: data.staff_late, tone: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Attendance Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Real-time biometric attendance monitoring for students and staff.
        </p>
        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${stat.tone}`}>{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Currently in School */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Currently in School</h2>
          <div className="mt-4 max-h-[400px] overflow-y-auto space-y-3 pr-2">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : realtime.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">No one currently in school.</p>
            ) : (
              realtime.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <div>
                    <p className="font-medium text-slate-100">{person.name}</p>
                    <p className="text-xs text-slate-400">{person.role}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      {person.person_type}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{new Date(person.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Scan Feed */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Recent Scan Feed</h2>
          <div className="mt-4 max-h-[400px] overflow-y-auto space-y-3 pr-2">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : data.recent_events.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">No recent scans.</p>
            ) : (
              data.recent_events.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex gap-3 items-center">
                    <div className={`h-2 w-2 rounded-full ${event.event_type === 'IN' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <div>
                      <p className="font-medium text-slate-100">{event.person_name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-2">
                       {event.is_late && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">LATE</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        event.event_type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {event.event_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase">{event.person_type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
