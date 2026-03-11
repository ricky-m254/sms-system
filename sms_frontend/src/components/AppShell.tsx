import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { apiClient } from '../api/client'
import {
  BookOpen, Building2, ChevronDown, ChevronRight, ChevronLeft,
  GraduationCap, LayoutDashboard, LogOut, MessageSquare, Package,
  Settings, Shield, Users, Wrench, Activity, Trophy,
  HeartPulse, Bus, UserCheck, DollarSign, BookMarked, Home,
  FlaskConical, CalendarDays, Microscope, Monitor, BarChart3,
} from 'lucide-react'

interface NavGroup {
  key: string
  label: string
  icon: React.ElementType
  color: string
  items: { label: string; route: string; icon?: React.ElementType }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'student', label: 'Student Management', icon: Users, color: 'text-sky-400',
    items: [
      { label: 'Students', route: '/modules/students' },
      { label: 'Admissions', route: '/modules/admissions/dashboard' },
      { label: 'Alumni', route: '/modules/alumni/dashboard' },
      { label: 'Parent Portal', route: '/modules/parent-portal/dashboard' },
    ],
  },
  {
    key: 'academic', label: 'Academic Management', icon: GraduationCap, color: 'text-violet-400',
    items: [
      { label: 'Academics', route: '/modules/academics/dashboard' },
      { label: 'Curriculum', route: '/modules/curriculum/dashboard' },
      { label: 'Timetable', route: '/modules/timetable/grid' },
      { label: 'Examinations', route: '/modules/examinations' },
      { label: 'E-Learning', route: '/modules/elearning/dashboard' },
      { label: 'Parent-Teacher Meetings', route: '/modules/ptm/dashboard' },
    ],
  },
  {
    key: 'finance', label: 'Finance & Commerce', icon: DollarSign, color: 'text-emerald-400',
    items: [
      { label: 'Finance', route: '/modules/finance' },
      { label: 'Cafeteria', route: '/modules/cafeteria/dashboard' },
      { label: 'Store & Inventory', route: '/modules/store' },
      { label: 'Assets', route: '/modules/assets/dashboard' },
    ],
  },
  {
    key: 'staff', label: 'Staff & Human Resources', icon: UserCheck, color: 'text-amber-400',
    items: [
      { label: 'Staff Directory', route: '/modules/staff/dashboard' },
      { label: 'HR & Payroll', route: '/modules/hr/dashboard' },
      { label: 'Clock In / Out', route: '/modules/clockin/dashboard' },
    ],
  },
  {
    key: 'operations', label: 'School Operations', icon: Building2, color: 'text-rose-400',
    items: [
      { label: 'Library', route: '/modules/library/dashboard' },
      { label: 'Transport', route: '/modules/transport/dashboard' },
      { label: 'Hostel / Boarding', route: '/modules/hostel/dashboard' },
      { label: 'Visitor Management', route: '/modules/visitors/dashboard' },
      { label: 'Dispensary', route: '/modules/dispensary' },
      { label: 'Maintenance', route: '/modules/maintenance/dashboard' },
    ],
  },
  {
    key: 'student-life', label: 'Student Life', icon: Trophy, color: 'text-orange-400',
    items: [
      { label: 'Sports & Clubs', route: '/modules/sports/dashboard' },
      { label: 'Cafeteria', route: '/modules/cafeteria/dashboard' },
    ],
  },
  {
    key: 'communication', label: 'Communication', icon: MessageSquare, color: 'text-cyan-400',
    items: [
      { label: 'Communication', route: '/modules/communication/dashboard' },
    ],
  },
  {
    key: 'intelligence', label: 'Reports & Analytics', icon: BarChart3, color: 'text-pink-400',
    items: [
      { label: 'Analytics Dashboard', route: '/modules/analytics/dashboard' },
      { label: 'Financial Reports', route: '/modules/finance/audit-reports' },
    ],
  },
]

interface SchoolBranding {
  school_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['student', 'academic']))
  const [branding, setBranding] = useState<SchoolBranding | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { username, logout } = useAuthStore(s => ({ username: s.username, logout: s.logout }))

  useEffect(() => {
    apiClient.get<any>('/school/profile/').then(r => {
      const d = r.data
      setBranding({
        school_name: d.school_name || 'Rynaty SMS',
        logo_url: d.logo_url || null,
        primary_color: d.primary_color || '#10b981',
        secondary_color: d.secondary_color || '#0ea5e9',
      })
      const root = document.documentElement
      root.style.setProperty('--brand-primary', d.primary_color || '#10b981')
      root.style.setProperty('--brand-secondary', d.secondary_color || '#0ea5e9')
    }).catch(() => {})
  }, [])

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const isActiveGroup = (group: NavGroup) =>
    group.items.some(i => location.pathname.startsWith(i.route.replace(/\/dashboard$/, '')))

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={`flex flex-col bg-slate-950 border-r border-slate-800/60 transition-all duration-200 flex-shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
        style={{ zIndex: 40 }}
      >
        {/* Logo / School Name */}
        <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-slate-800/60 min-h-[56px] ${collapsed ? 'justify-center' : ''}`}>
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="logo" className="w-7 h-7 rounded-lg object-contain flex-shrink-0" />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-950 font-bold text-xs"
              style={{ background: branding?.primary_color ?? '#10b981' }}
            >
              {(branding?.school_name ?? 'R')[0]}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white leading-tight truncate">{branding?.school_name ?? 'Rynaty SMS'}</p>
              <p className="text-[9px] text-slate-500 leading-tight">School Management</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="flex justify-end px-2 pt-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="rounded-lg p-1 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-2 py-2 text-xs transition ${
                isActive ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title="Dashboard"
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Module Groups */}
          {NAV_GROUPS.map(group => {
            const Icon = group.icon
            const isActive = isActiveGroup(group)
            const isOpen = openGroups.has(group.key)

            if (collapsed) {
              return (
                <div key={group.key} className="relative group">
                  <button
                    onClick={() => { setCollapsed(false); setOpenGroups(new Set([group.key])) }}
                    className={`w-full flex justify-center rounded-lg p-2 transition ${
                      isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                    }`}
                    title={group.label}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : group.color}`} />
                  </button>
                </div>
              )
            }

            return (
              <div key={group.key}>
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                    isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-white' : group.color}`} />
                  <span className="flex-1 text-left font-semibold tracking-wide uppercase text-[10px]">{group.label}</span>
                  {isOpen
                    ? <ChevronDown className="h-3 w-3 text-slate-600" />
                    : <ChevronRight className="h-3 w-3 text-slate-600" />
                  }
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-800/60 pl-2">
                    {group.items.map(item => (
                      <NavLink
                        key={item.route}
                        to={item.route}
                        className={({ isActive: ia }) =>
                          `block truncate rounded-lg px-2 py-1.5 text-[11px] transition ${
                            ia || location.pathname.startsWith(item.route.replace(/\/dashboard$/, ''))
                              ? 'bg-slate-800/80 text-white font-semibold'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className={`border-t border-slate-800/60 px-2 py-2 space-y-0.5 ${collapsed ? '' : ''}`}>
          <NavLink
            to="/settings/school-profile"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-2 py-2 text-xs transition ${
                isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title="Settings"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-200 flex-shrink-0">
                {(username ?? 'U')[0].toUpperCase()}
              </div>
              <span className="flex-1 text-[11px] text-slate-400 truncate">{username}</span>
              <button onClick={handleLogout} title="Logout" className="text-slate-600 hover:text-rose-400 transition">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center rounded-lg p-2 text-slate-600 hover:text-rose-400 hover:bg-slate-800/50 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
