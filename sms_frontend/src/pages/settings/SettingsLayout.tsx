import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { settingsSidebar } from '../../settings'

export default function SettingsLayout() {
  const [isNavOpen, setIsNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:col-span-4 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Settings</p>
          <h2 className="mt-2 text-lg font-display font-semibold">Configuration</h2>
          <p className="mt-2 text-xs text-slate-400">
            Manage global and module-specific preferences.
          </p>
          <button
            className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 md:hidden"
            onClick={() => setIsNavOpen((prev) => !prev)}
          >
            {isNavOpen ? 'Hide menu' : 'Show menu'}
          </button>
          <div className={`mt-5 space-y-2 text-sm ${isNavOpen ? 'block' : 'hidden'} md:block`}>
            {settingsSidebar.map((item) => (
              <NavLink
                key={item.key}
                to={`/settings/${item.key}`}
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
          </div>
        </aside>

        <div className="col-span-12 md:col-span-8 lg:col-span-9">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
