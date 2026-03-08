import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const MODULES = [
  { key: 'STUDENTS', label: 'Students', route: '/modules/students' },
  { key: 'ADMISSIONS', label: 'Admissions', route: '/modules/admissions/dashboard' },
  { key: 'ACADEMICS', label: 'Academics', route: '/modules/academics/dashboard' },
  { key: 'FINANCE', label: 'Finance', route: '/modules/finance' },
  { key: 'HR', label: 'HR', route: '/modules/hr/dashboard' },
  { key: 'STAFF', label: 'Staff', route: '/modules/staff/dashboard' },
  { key: 'COMMUNICATION', label: 'Comms', route: '/modules/communication/dashboard' },
  { key: 'LIBRARY', label: 'Library', route: '/modules/library/dashboard' },
  { key: 'PARENTS', label: 'Parents', route: '/modules/parent-portal/dashboard' },
]

interface Props {
  currentModule?: string
}

export default function ModuleToolbar({ currentModule }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-5 space-y-2">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex w-full items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300"
      >
        <span>←</span>
        <span>Dashboard</span>
      </button>

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700/60 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
      >
        <span>Switch module</span>
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          {MODULES.map((mod) => (
            <button
              key={mod.key}
              onClick={() => {
                navigate(mod.route)
                setOpen(false)
              }}
              className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition ${
                currentModule === mod.key
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-700 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200'
              }`}
            >
              {mod.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-slate-800/80" />
    </div>
  )
}
