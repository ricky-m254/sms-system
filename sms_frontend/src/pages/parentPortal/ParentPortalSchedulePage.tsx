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
      <header className="rounded-2xl glass-panel p-6">
        <h1 className="text-xl font-display font-semibold">Timetable & Schedule</h1>
      </header>
      <section className="rounded-xl glass-panel p-4 text-sm text-slate-300">
        Timetable Items: {timetable.length} | Calendar Events: {calendar.length}
      </section>
    </div>
  )
}

