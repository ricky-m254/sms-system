import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalAttendancePage() {
  const [summary, setSummary] = useState<any>({})
  const [incidents, setIncidents] = useState<any[]>([])

  useEffect(() => {
    Promise.all([apiClient.get('/parent-portal/attendance/summary/'), apiClient.get('/parent-portal/behavior/incidents/')])
      .then(([s, i]) => {
        setSummary(s.data ?? {})
        setIncidents(i.data ?? [])
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Attendance & Behavior</h1>
      </header>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        Attendance Rate: {summary.attendance_rate ?? 0}% | Present: {summary.present ?? 0} | Absent: {summary.absent ?? 0} | Late: {summary.late ?? 0}
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        Behavior Incidents: {incidents.length}
      </section>
    </div>
  )
}

