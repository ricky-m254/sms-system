import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalSchedulePage() {
  const [timetable, setTimetable] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])

  useEffect(() => {
    Promise.all([apiClient.get('/parent-portal/timetable/'), apiClient.get('/parent-portal/calendar/')])
      .then(([t, c]) => {
        setTimetable(t.data ?? [])
        setCalendar(c.data ?? [])
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Timetable & Schedule"
        subtitle="Timetable & Schedule management and overview."
        icon="📋"
      />
      <section className="rounded-xl glass-panel p-4 text-sm text-slate-300">
        Timetable Items: {timetable.length} | Calendar Events: {calendar.length}
      </section>
    </div>
  )
}

