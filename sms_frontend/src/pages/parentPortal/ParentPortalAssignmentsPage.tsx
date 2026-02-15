import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    Promise.all([apiClient.get('/parent-portal/assignments/'), apiClient.get('/parent-portal/events/')])
      .then(([a, e]) => {
        setAssignments(a.data ?? [])
        setEvents(e.data ?? [])
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Assignments & Events</h1>
      </header>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        Assignments: {assignments.length} | Events: {events.length}
      </section>
    </div>
  )
}

