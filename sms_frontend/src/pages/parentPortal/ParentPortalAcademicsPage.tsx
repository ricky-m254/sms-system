import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalAcademicsPage() {
  const [grades, setGrades] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])

  useEffect(() => {
    Promise.all([apiClient.get('/parent-portal/academics/grades/'), apiClient.get('/parent-portal/academics/report-cards/')])
      .then(([g, c]) => {
        setGrades(g.data ?? [])
        setCards(c.data ?? [])
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl glass-panel p-6">
        <h1 className="text-xl font-display font-semibold">Academic Performance</h1>
      </header>
      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold">Current Grades</h2>
        <div className="mt-3 text-sm text-slate-300">{grades.length ? grades.map((g) => `${g.subject}: ${g.total_score}`).join(' | ') : 'No grades yet.'}</div>
      </section>
      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold">Report Cards</h2>
        <div className="mt-3 text-sm text-slate-300">{cards.length ? cards.map((c) => `${c.term} ${c.academic_year} (${c.status})`).join(' | ') : 'No report cards yet.'}</div>
      </section>
    </div>
  )
}

