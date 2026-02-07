import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const MODULE_LABELS: Record<string, string> = {
  STUDENTS: 'Students',
  FINANCE: 'Finance',
  ACADEMICS: 'Academics',
  HR: 'Human Resources',
  COMMUNICATION: 'Communication',
  REPORTING: 'Reporting & Analytics',
  CORE: 'Core Administration',
  ASSETS: 'Assets & Inventory',
}

export default function ModuleDashboardPage() {
  const { moduleKey } = useParams<{ moduleKey: string }>()
  const username = useAuthStore((state) => state.username)
  const tenantId = useAuthStore((state) => state.tenantId)

  const label = useMemo(() => {
    if (!moduleKey) return 'Module'
    return MODULE_LABELS[moduleKey.toUpperCase()] ?? moduleKey
  }, [moduleKey])

  if (moduleKey?.toLowerCase() === 'students') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 sm:py-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h1 className="text-xl font-display font-semibold">Redirecting...</h1>
            <p className="mt-2 text-sm text-slate-400">
              Students dashboard is available at `/modules/students`.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Module Dashboard</p>
            <h1 className="text-2xl font-display font-semibold">{label}</h1>
            <p className="text-sm text-slate-400">Tenant: {tenantId ?? 'public'}</p>
          </div>
          <Link
            className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 sm:w-auto"
            to="/dashboard"
          >
            Back to main dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Module routing is active</h2>
          <p className="mt-2 text-sm text-slate-400">
            This is a placeholder shell for the {label} module. We can wire real data and
            workflows once you pick the module to build out.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Signed in as {username ?? 'user'}.
          </p>
        </div>
      </main>
    </div>
  )
}
