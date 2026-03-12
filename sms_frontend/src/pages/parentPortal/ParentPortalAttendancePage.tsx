import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

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
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Attendance & Behavior"
        subtitle="Attendance & Behavior management and overview."
        icon="📋"
      />
      <section className="rounded-xl glass-panel p-4 text-sm text-slate-300">
        Attendance Rate: {summary.attendance_rate ?? 0}% | Present: {summary.present ?? 0} | Absent: {summary.absent ?? 0} | Late: {summary.late ?? 0}
      </section>
      <section className="rounded-xl glass-panel p-4 text-sm text-slate-300">
        Behavior Incidents: {incidents.length}
      </section>
    </div>
  )
}

