import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

const navItems = [
  { label: 'Dashboard', to: '/modules/finance' },
  { label: 'Invoices', to: '/modules/finance/invoices' },
  { label: 'Payments', to: '/modules/finance/payments' },
  { label: 'Expenses', to: '/modules/finance/expenses' },
  { label: 'Fee Structures', to: '/modules/finance/fee-structures' },
  { label: 'Fee Assignments', to: '/modules/finance/fee-assignments' },
  { label: 'Adjustments', to: '/modules/finance/adjustments' },
  { label: 'Accounts', to: '/modules/finance/accounts' },
  { label: 'Reconciliation', to: '/modules/finance/reconciliation' },
  { label: 'Reports', to: '/modules/finance/reports' },
  { label: 'Scholarships', to: '/modules/finance/scholarships' },
  { label: 'Refunds', to: '/modules/finance/refunds' },
  { label: 'Settings', to: '/settings/finance' },
]

export default function FinanceLayout() {
  const tenantId = useAuthStore((state) => state.tenantId)
  const username = useAuthStore((state) => state.username)
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [navQuery, setNavQuery] = useState('')

  const filteredNavItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(navQuery.trim().toLowerCase()),
  )

  useEffect(() => {
    setIsNavOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:col-span-3 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
          <h2 className="mt-2 text-lg font-display font-semibold">Module</h2>
          <button
            className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 md:hidden"
            onClick={() => setIsNavOpen((prev) => !prev)}
          >
            {isNavOpen ? 'Hide menu' : 'Show menu'}
          </button>
          <input
            className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            placeholder="Find section"
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
          />
          <div className={`mt-4 space-y-2 text-sm ${isNavOpen ? 'block' : 'hidden'} md:block`}>
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/modules/finance'}
                onClick={() => setIsNavOpen(false)}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-2 transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {filteredNavItems.length === 0 ? (
              <p className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400">
                No matching sections.
              </p>
            ) : null}
          </div>
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
            <p>
              <strong>Tenant:</strong> {tenantId ?? 'public'}
            </p>
            <p className="mt-2">
              <strong>User:</strong> {username ?? 'user'}
            </p>
          </div>
        </aside>

        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
