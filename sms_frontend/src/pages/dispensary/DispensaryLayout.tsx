import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Pill, BarChart2, ChevronLeft, Stethoscope } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/modules/dispensary', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/modules/dispensary/visits', label: 'Patient Visits', icon: Users },
  { to: '/modules/dispensary/stock', label: 'Medication Stock', icon: Pill },
  { to: '/modules/dispensary/reports', label: 'Reports', icon: BarChart2 },
];

export default function DispensaryLayout() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-3"
          >
            <ChevronLeft size={14} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-emerald-400" />
            <span className="font-semibold text-slate-100">Dispensary</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
        <Outlet />
      </main>
    </div>
  );
}
