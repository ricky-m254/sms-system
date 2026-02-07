import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'

type DashboardSummary = {
  modules: string[]
  modules_detail: Array<{ key: string; name: string }>
  unavailable_modules: string[]
  summary: Record<string, Record<string, number>>
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const username = useAuthStore((state) => state.username)
  const tenantId = useAuthStore((state) => state.tenantId)

  const [data, setData] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadSummary = async () => {
      try {
        const response = await apiClient.get<DashboardSummary>('/dashboard/summary/')
        if (isMounted) {
          setData(response.data)
        }
      } catch {
        if (isMounted) {
          setError('Unable to load dashboard summary.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSummary()
    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Main Dashboard</p>
            <h1 className="text-2xl font-display font-semibold">Welcome back{username ? `, ${username}` : ''}</h1>
            <p className="text-sm text-slate-400">Tenant: {tenantId ?? 'public'}</p>
          </div>
          <button
            className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 sm:w-auto"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-300">Loading summary...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-display font-semibold">Module access</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Modules assigned to the current user.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.modules_detail.map((module) => (
                    <span
                      key={module.key}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                    >
                      {module.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-display font-semibold">Summary highlights</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Aggregated counts per module.
                </p>
                <div className="mt-4 grid gap-3">
                  {Object.entries(data.summary).map(([key, values]) => (
                    <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                        {key}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-200">
                        {Object.entries(values).map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-2">
                            <span className="text-slate-400">{label.replace(/_/g, ' ')}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-display font-semibold">Next steps</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use module dashboards for operational work.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {data.modules.map((moduleKey) => (
                  <button
                    key={moduleKey}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
                    onClick={() => navigate(`/modules/${moduleKey.toLowerCase()}`)}
                  >
                    Open {moduleKey} dashboard
                  </button>
                ))}
              </div>
              {data.unavailable_modules.length > 0 ? (
                <p className="mt-4 text-xs text-amber-300">
                  Unavailable modules: {data.unavailable_modules.join(', ')}
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}
