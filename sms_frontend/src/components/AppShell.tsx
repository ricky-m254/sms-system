import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { apiClient } from '../api/client'
import {
  BookOpen, Building2, ChevronDown, ChevronRight, ChevronLeft,
  GraduationCap, LayoutDashboard, LogOut, MessageSquare, Package,
  Settings, Shield, Users, Wrench, Activity, Trophy,
  HeartPulse, Bus, UserCheck, DollarSign, BookMarked, Home,
  FlaskConical, CalendarDays, Microscope, Monitor, BarChart3, Zap,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

interface NavGroup {
  key: string
  label: string
  icon: React.ElementType
  dotColor: string
  items: { label: string; route: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'student', label: 'Students', icon: Users, dotColor: 'bg-sky-400',
    items: [
      { label: 'Students', route: '/modules/students' },
      { label: 'Admissions', route: '/modules/admissions/dashboard' },
      { label: 'Alumni', route: '/modules/alumni/dashboard' },
      { label: 'Parent Portal', route: '/modules/parent-portal/dashboard' },
    ],
  },
  {
    key: 'academic', label: 'Academics', icon: GraduationCap, dotColor: 'bg-violet-400',
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
    key: 'finance', label: 'Finance', icon: DollarSign, dotColor: 'bg-emerald-400',
    items: [
      { label: 'Finance', route: '/modules/finance' },
      { label: 'Cafeteria', route: '/modules/cafeteria/dashboard' },
      { label: 'Store & Inventory', route: '/modules/store' },
      { label: 'Assets', route: '/modules/assets/dashboard' },
    ],
  },
  {
    key: 'staff', label: 'Staff & HR', icon: UserCheck, dotColor: 'bg-amber-400',
    items: [
      { label: 'Staff Directory', route: '/modules/staff/dashboard' },
      { label: 'HR & Payroll', route: '/modules/hr/dashboard' },
      { label: 'Clock In / Out', route: '/modules/clockin/dashboard' },
    ],
  },
  {
    key: 'operations', label: 'Operations', icon: Building2, dotColor: 'bg-rose-400',
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
    key: 'student-life', label: 'Student Life', icon: Trophy, dotColor: 'bg-orange-400',
    items: [
      { label: 'Sports & Clubs', route: '/modules/sports/dashboard' },
      { label: 'Cafeteria', route: '/modules/cafeteria/dashboard' },
    ],
  },
  {
    key: 'communication', label: 'Communication', icon: MessageSquare, dotColor: 'bg-cyan-400',
    items: [
      { label: 'Communication', route: '/modules/communication/dashboard' },
    ],
  },
  {
    key: 'intelligence', label: 'Analytics', icon: BarChart3, dotColor: 'bg-pink-400',
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
  const [cursor, setCursor] = useState({ x: -2000, y: -2000 })
  const location = useLocation()
  const navigate = useNavigate()
  const { username, role, logout } = useAuthStore(s => ({ username: s.username, role: s.role, logout: s.logout }))

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    apiClient.get<Record<string, unknown>>('/school/profile/').then(r => {
      const d = r.data
      const primary = (d.primary_color as string) || '#10b981'
      setBranding({
        school_name: (d.school_name as string) || 'Rynaty SMS',
        logo_url: (d.logo_url as string) || null,
        primary_color: primary,
        secondary_color: (d.secondary_color as string) || '#0ea5e9',
      })
      const root = document.documentElement
      root.style.setProperty('--brand-primary', primary)
      root.style.setProperty('--brand-secondary', (d.secondary_color as string) || '#0ea5e9')
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

  const primaryColor = branding?.primary_color ?? '#10b981'
  const schoolInitial = (branding?.school_name ?? 'R')[0].toUpperCase()

  const roleLabels: Record<string, string> = {
    TENANT_SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    TEACHER: 'Teacher',
    ACCOUNTANT: 'Accountant',
  }
  const roleLabel = roleLabels[(role ?? '').toUpperCase()] ?? 'Staff'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#070b12' }}>
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside
        className={`relative flex flex-col flex-shrink-0 border-r transition-all duration-300 ease-in-out overflow-hidden
          ${collapsed ? 'w-[60px]' : 'w-[230px]'}`}
        style={{
          background: 'linear-gradient(180deg, #0d1421 0%, #0a0f1a 100%)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        {/* ── Logo / School Brand ───────────────────── */}
        <div
          className={`relative flex items-center gap-3 border-b flex-shrink-0 overflow-hidden
            ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'}`}
          style={{ borderColor: 'rgba(255,255,255,0.07)', minHeight: 64 }}
        >
          {/* Brand glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: `radial-gradient(ellipse at top left, ${primaryColor}40 0%, transparent 65%)` }}
          />

          {/* Logo */}
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt="School logo"
              className="w-8 h-8 rounded-xl object-contain flex-shrink-0 ring-1 ring-white/10"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-lg ring-1 ring-white/10"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` }}
            >
              {schoolInitial}
            </div>
          )}

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white leading-tight truncate font-display">
                {branding?.school_name ?? 'Rynaty SMS'}
              </p>
              <p className="text-[10px] font-medium leading-tight mt-0.5"
                style={{ color: `${primaryColor}bb` }}>
                School Management
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ──────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin"
          style={{ scrollbarWidth: 'thin' }}>

          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            end
            title="Dashboard"
            className={({ isActive }) =>
              `group flex items-center gap-2.5 rounded-xl transition-all duration-150 relative overflow-hidden
              ${collapsed ? 'justify-center px-0 py-2.5 w-full' : 'px-3 py-2.5'}
              ${isActive
                ? 'bg-white/[0.08] text-white font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: primaryColor }}
                  />
                )}
                <LayoutDashboard
                  size={15}
                  className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}
                />
                {!collapsed && <span className="text-[13px] leading-none">Dashboard</span>}
              </>
            )}
          </NavLink>

          {/* Approvals Hub */}
          <NavLink
            to="/dashboard/approvals"
            end
            title="Approvals"
            className={({ isActive }) =>
              `group flex items-center gap-2.5 rounded-xl transition-all duration-150 relative overflow-hidden
              ${collapsed ? 'justify-center px-0 py-2.5 w-full' : 'px-3 py-2.5'}
              ${isActive
                ? 'bg-amber-500/[0.12] text-amber-300 font-semibold ring-1 ring-amber-500/25'
                : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/[0.06]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-amber-400" />
                )}
                <Zap size={15} className={`flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'}`} />
                {!collapsed && <span className="text-[13px] leading-none">Approvals</span>}
                {!collapsed && (
                  <span className="ml-auto">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                    </span>
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Divider */}
          <div className="my-2 mx-2 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Module Groups */}
          {NAV_GROUPS.map(group => {
            const Icon = group.icon
            const isActive = isActiveGroup(group)
            const isOpen = openGroups.has(group.key)

            if (collapsed) {
              return (
                <button
                  key={group.key}
                  onClick={() => { setCollapsed(false); setOpenGroups(new Set([group.key])) }}
                  title={group.label}
                  className={`w-full flex justify-center items-center rounded-xl py-2.5 transition-all duration-150
                    ${isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
                >
                  <Icon size={15} className={isActive ? 'text-white' : `text-slate-500 hover:text-slate-300`} />
                </button>
              )
            }

            return (
              <div key={group.key}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`group w-full flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-150
                    ${isActive ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${group.dotColor} ${isActive ? 'opacity-100' : 'opacity-50'}`} />
                  <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-[0.1em]">{group.label}</span>
                  {isOpen
                    ? <ChevronDown size={11} className="text-slate-700 group-hover:text-slate-500 flex-shrink-0" />
                    : <ChevronRight size={11} className="text-slate-700 group-hover:text-slate-500 flex-shrink-0" />
                  }
                </button>

                {/* Sub-items */}
                {isOpen && (
                  <div className="mt-0.5 ml-3 pl-3 space-y-0.5"
                    style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                    {group.items.map(item => {
                      const itemActive = location.pathname.startsWith(item.route.replace(/\/dashboard$/, ''))
                      return (
                        <NavLink
                          key={item.route}
                          to={item.route}
                          className={`flex items-center rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-100 relative
                            ${itemActive
                              ? 'text-white font-semibold bg-white/[0.07]'
                              : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                            }`}
                        >
                          {itemActive && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
                              style={{ background: primaryColor }}
                            />
                          )}
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* ── Bottom Section ────────────────────────────── */}
        <div className="flex-shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {/* Settings link */}
          <div className="px-2 pt-2">
            <NavLink
              to="/settings/school-profile"
              title="Settings"
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-xl transition-all duration-150
                ${collapsed ? 'justify-center px-0 py-2.5 w-full' : 'px-3 py-2.5'}
                ${isActive ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}`
              }
            >
              {!collapsed
                ? <><Settings size={14} className="flex-shrink-0" /><span className="text-[13px]">Settings</span></>
                : <Settings size={14} />
              }
            </NavLink>
          </div>

          {/* User Card */}
          <div className={`p-2 ${collapsed ? 'flex justify-center pb-3' : ''}`}>
            {collapsed ? (
              <button
                onClick={handleLogout}
                title="Log out"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut size={14} />
              </button>
            ) : (
              <div
                className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 mb-1"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white ring-1 ring-white/10"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}80, ${primaryColor}30)` }}
                >
                  {(username ?? 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 leading-tight truncate">{username ?? 'User'}</p>
                  <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: `${primaryColor}99` }}>{roleLabel}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-slate-600 hover:text-slate-300 transition-all
              ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen size={13} />
              : <><PanelLeftClose size={13} /><span className="text-[11px]">Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* ── Cursor spotlight overlay (glass glow follows mouse) ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 9998,
          background: `radial-gradient(700px circle at ${cursor.x}px ${cursor.y}px, rgba(16,185,129,0.05), transparent 45%)`,
          transition: 'background 0.05s ease',
        }}
      />

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
