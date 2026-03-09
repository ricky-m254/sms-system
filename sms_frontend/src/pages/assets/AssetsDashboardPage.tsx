import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type DashboardData = {
  total_assets: number
  active: number
  in_repair: number
  retired: number
  disposed: number
  total_value: number
  total_cost: number
  total_accumulated_depreciation: number
  categories_count: number
  assignments_active: number
  maintenance_pending: number
}

export default function AssetsDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    total_assets: 0,
    active: 0,
    in_repair: 0,
    retired: 0,
    disposed: 0,
    total_value: 0,
    total_cost: 0,
    total_accumulated_depreciation: 0,
    categories_count: 0,
    assignments_active: 0,
    maintenance_pending: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.get<DashboardData>('/assets/dashboard/')
        if (mounted) {
          setData(response.data)
        }
      } catch {
        if (mounted) setError('Assets dashboard data unavailable.')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const cards = [
    { label: 'Total Assets', value: data.total_assets, tone: 'text-emerald-300' },
    { label: 'Active', value: data.active, tone: 'text-sky-300' },
    { label: 'In Repair', value: data.in_repair, tone: 'text-amber-300' },
    { label: 'Retired / Disposed', value: data.retired + data.disposed, tone: 'text-rose-300' },
    { label: 'Total Cost (Gross)', value: `$${fmt(data.total_cost)}`, tone: 'text-slate-300' },
    { label: 'Accumulated Depreciation', value: `$${fmt(data.total_accumulated_depreciation)}`, tone: 'text-amber-300' },
    { label: 'Net Book Value', value: `$${fmt(data.total_value)}`, tone: 'text-violet-300' },
    { label: 'Pending Maintenance', value: data.maintenance_pending, tone: 'text-orange-300' },
  ]

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Assets Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Real-time overview of school assets, value, and maintenance status.
        </p>
        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      </header>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading dashboard...</p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
              <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
