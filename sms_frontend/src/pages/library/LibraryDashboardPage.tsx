import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type DashboardData = {
  resources: number
  copies: number
  members: number
  activeBorrowings: number
  overdue: number
  reservationsWaiting: number
  finesPending: number
}

export default function LibraryDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    resources: 0,
    copies: 0,
    members: 0,
    activeBorrowings: 0,
    overdue: 0,
    reservationsWaiting: 0,
    finesPending: 0,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [resources, copies, members, transactions, overdue, reservations, fines] = await Promise.all([
          apiClient.get('/library/resources/'),
          apiClient.get('/library/copies/'),
          apiClient.get('/library/members/'),
          apiClient.get('/library/circulation/transactions/'),
          apiClient.get('/library/circulation/overdue/'),
          apiClient.get('/library/reservations/'),
          apiClient.get('/library/fines/'),
        ])
        if (!mounted) return
        setData({
          resources: resources.data.length ?? 0,
          copies: copies.data.length ?? 0,
          members: members.data.length ?? 0,
          activeBorrowings: (transactions.data ?? []).filter((row: any) => !row.return_date).length,
          overdue: overdue.data.length ?? 0,
          reservationsWaiting: (reservations.data ?? []).filter((row: any) => row.status === 'Waiting').length,
          finesPending: (fines.data ?? []).filter((row: any) => row.status === 'Pending').length,
        })
      } catch {
        if (mounted) setError('Library API unavailable. Showing zero baseline.')
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const cards = [
    { label: 'Resources', value: data.resources },
    { label: 'Copies', value: data.copies },
    { label: 'Members', value: data.members },
    { label: 'Active Borrowings', value: data.activeBorrowings },
    { label: 'Overdue', value: data.overdue },
    { label: 'Waiting Reservations', value: data.reservationsWaiting },
    { label: 'Pending Fines', value: data.finesPending },
  ]

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Library Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Baseline KPIs for catalog, circulation, reservations, members, and fines.
        </p>
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{card.value}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

