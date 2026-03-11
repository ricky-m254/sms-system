import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertCircle, ArrowRight, BarChart2, BookOpen, Building2, CheckCircle2,
  ChevronDown, ChevronRight, DollarSign, GraduationCap, MessageSquare,
  Play, RefreshCw, ShoppingCart, Undo2, Users, Zap,
} from 'lucide-react'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'
import { isBackendModuleEnabled } from '../config/moduleFocus'

type DashboardSummary = {
  modules: string[]
  modules_detail: Array<{ key: string; name: string }>
  unavailable_modules: string[]
  summary: Record<string, Record<string, number>>
}
type SchoolProfilePayload = {
  tenant?: { name?: string | null; schema?: string | null }
  profile?: { school_name?: string | null } | null
}
type ActivityItem = {
  id: number
  type: 'store_order' | 'reversal' | 'writeoff'
  label: string; sub: string; status: string; createdAt: string; route: string; needsApproval: boolean
}
type ActivityData = { todayItems: ActivityItem[]; pendingItems: ActivityItem[] }

const MODULE_ROUTES: Record<string, string> = {
  STUDENTS: '/modules/students',
  ADMISSIONS: '/modules/admissions/dashboard',
  FINANCE: '/modules/finance',
  ACADEMICS: '/modules/academics/dashboard',
  HR: '/modules/hr/dashboard',
  STAFF: '/modules/staff/dashboard',
  COMMUNICATION: '/modules/communication/dashboard',
  LIBRARY: '/modules/library/dashboard',
  ASSETS: '/modules/assets/dashboard',
  PARENTS: '/modules/parent-portal/dashboard',
  PARENT_PORTAL: '/modules/parent-portal/dashboard',
  STORE: '/modules/store',
  DISPENSARY: '/modules/dispensary',
  CLOCKIN: '/modules/clockin/dashboard',
  TIMETABLE: '/modules/timetable/grid',
  TRANSPORT: '/modules/transport/dashboard',
  VISITOR_MGMT: '/modules/visitors/dashboard',
  EXAMINATIONS: '/modules/examinations/dashboard',
  ALUMNI: '/modules/alumni/dashboard',
  HOSTEL: '/modules/hostel/dashboard',
  PTM: '/modules/ptm/dashboard',
  SPORTS: '/modules/sports/dashboard',
  CAFETERIA: '/modules/cafeteria/dashboard',
  CURRICULUM: '/modules/curriculum/dashboard',
  MAINTENANCE: '/modules/maintenance/dashboard',
  ELEARNING: '/modules/elearning/dashboard',
  ANALYTICS: '/modules/analytics/dashboard',
  REPORTING: '/modules/finance/audit-reports',
}

const MODULE_LABELS: Record<string, string> = {
  STUDENTS: 'Students', ADMISSIONS: 'Admissions', FINANCE: 'Finance',
  ACADEMICS: 'Academics', HR: 'Human Resources', STAFF: 'Staff',
  COMMUNICATION: 'Communication', LIBRARY: 'Library', PARENTS: 'Parent Portal',
  ASSETS: 'Assets', STORE: 'Store & Inventory', DISPENSARY: 'Dispensary',
  CLOCKIN: 'Clock In / Out', TIMETABLE: 'Timetable', TRANSPORT: 'Transport',
  VISITOR_MGMT: 'Visitor Management', EXAMINATIONS: 'Examinations', ALUMNI: 'Alumni',
  HOSTEL: 'Hostel', PTM: 'Parent-Teacher Meetings', SPORTS: 'Sports',
  CAFETERIA: 'Cafeteria', CURRICULUM: 'Curriculum', MAINTENANCE: 'Maintenance',
  ELEARNING: 'E-Learning', ANALYTICS: 'Analytics', REPORTING: 'Reporting',
}

const MODULE_KEY_ALIASES: Record<string, string> = { PARENT_PORTAL: 'PARENTS' }
const normalizeModuleKey = (k: string) => {
  const n = (k || '').toUpperCase()
  return MODULE_KEY_ALIASES[n] ?? n
}

interface SystemGroup {
  key: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  modules: string[]
}

const SYSTEM_GROUPS: SystemGroup[] = [
  {
    key: 'student-mgmt',
    label: 'Student Management',
    description: 'Full student lifecycle — admissions, records, parents and alumni.',
    icon: GraduationCap,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    modules: ['STUDENTS', 'ADMISSIONS', 'ALUMNI', 'PARENTS'],
  },
  {
    key: 'academic-mgmt',
    label: 'Academic Management',
    description: 'Teaching, learning, timetabling, exams and e-learning.',
    icon: BookOpen,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    modules: ['ACADEMICS', 'CURRICULUM', 'TIMETABLE', 'EXAMINATIONS', 'ELEARNING', 'PTM'],
  },
  {
    key: 'finance',
    label: 'Finance & Commerce',
    description: 'Fees, payments, inventory, assets and financial reporting.',
    icon: DollarSign,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    modules: ['FINANCE', 'STORE', 'ASSETS', 'CAFETERIA'],
  },
  {
    key: 'staff-hr',
    label: 'Staff & HR',
    description: 'Employee records, payroll, leave, attendance and recruitment.',
    icon: Users,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    modules: ['STAFF', 'HR', 'CLOCKIN'],
  },
  {
    key: 'school-ops',
    label: 'School Operations',
    description: 'Daily logistics — library, transport, hostel, health and facilities.',
    icon: Building2,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    modules: ['LIBRARY', 'TRANSPORT', 'HOSTEL', 'VISITOR_MGMT', 'DISPENSARY', 'MAINTENANCE'],
  },
  {
    key: 'student-life',
    label: 'Student Life',
    description: 'Sports, clubs and extracurricular activities.',
    icon: Play,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    modules: ['SPORTS'],
  },
  {
    key: 'communication',
    label: 'Communication',
    description: 'Announcements, messaging and parent engagement.',
    icon: MessageSquare,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    modules: ['COMMUNICATION'],
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    description: 'KPI dashboards, insights and scheduled reports.',
    icon: BarChart2,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    modules: ['ANALYTICS', 'REPORTING'],
  },
]

const QUICK_ACTIONS = [
  { label: 'Admit Student', route: '/modules/admissions/dashboard', module: 'ADMISSIONS' },
  { label: 'Record Attendance', route: '/modules/academics/attendance', module: 'ACADEMICS' },
  { label: 'Create Invoice', route: '/modules/finance/invoices', module: 'FINANCE' },
  { label: 'Send Announcement', route: '/modules/communication/dashboard', module: 'COMMUNICATION' },
  { label: 'Add Examination', route: '/modules/examinations/dashboard', module: 'EXAMINATIONS' },
  { label: 'Register Visitor', route: '/modules/visitors/dashboard', module: 'VISITOR_MGMT' },
]

const ACTIVITY_TYPE_CONFIG = {
  store_order: { icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Store Order' },
  reversal: { icon: Undo2, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Payment Reversal' },
  writeoff: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Write-off' },
}
const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300', APPROVED: 'bg-emerald-500/20 text-emerald-300',
  REJECTED: 'bg-rose-500/20 text-rose-300', FULFILLED: 'bg-sky-500/20 text-sky-300',
}

function ActivityCard({ item, onNavigate, highlight }: { item: ActivityItem; onNavigate: () => void; highlight?: boolean }) {
  const cfg = ACTIVITY_TYPE_CONFIG[item.type]
  const Icon = cfg.icon
  const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3.5 transition cursor-pointer hover:border-emerald-500/50 ${highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-950/40'}`}
      onClick={onNavigate}
    >
      <div className={`flex-shrink-0 rounded-lg p-2 ${cfg.bg}`}><Icon size={14} className={cfg.color} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-slate-200 leading-tight truncate">{item.label}</p>
          <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_BADGE[item.status] || 'bg-slate-700 text-slate-400'}`}>{item.status}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{item.sub}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-600">{cfg.label} {time && `· ${time}`}</span>
          <ArrowRight size={11} className="text-slate-600" />
        </div>
      </div>
    </div>
  )
}

function SystemGroupCard({
  group, assignedKeys, onNavigate,
}: { group: SystemGroup; assignedKeys: Set<string>; onNavigate: (route: string) => void }) {
  const [open, setOpen] = useState(false)
  const Icon = group.icon
  const assignedCount = group.modules.filter(m => assignedKeys.has(m)).length

  return (
    <div className={`rounded-2xl border ${open ? group.borderColor : 'border-slate-800'} bg-slate-900/60 transition-all`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${group.bgColor}`}>
          <Icon className={`w-5 h-5 ${group.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">{group.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${assignedCount > 0 ? `${group.bgColor} ${group.color}` : 'bg-slate-800 text-slate-500'}`}>
              {assignedCount}/{group.modules.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{group.description}</p>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-slate-800/60">
          {group.modules.map(modKey => {
            const isAssigned = assignedKeys.has(modKey)
            const route = MODULE_ROUTES[modKey]
            return (
              <button
                key={modKey}
                onClick={() => isAssigned && route && onNavigate(route)}
                disabled={!isAssigned || !route}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  isAssigned
                    ? `${group.borderColor} ${group.bgColor} ${group.color} hover:opacity-80`
                    : 'border-slate-800 bg-slate-950/30 text-slate-600 cursor-not-allowed'
                }`}
              >
                <p className="text-xs font-semibold">{MODULE_LABELS[modKey] ?? modKey}</p>
                <p className={`text-[10px] mt-0.5 ${isAssigned ? 'opacity-70' : 'text-slate-700'}`}>
                  {isAssigned ? 'Open →' : 'Not assigned'}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const username = useAuthStore((state) => state.username)
  const tenantId = useAuthStore((state) => state.tenantId)

  const [data, setData] = useState<DashboardSummary | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityData>({ todayItems: [], pendingItems: [] })
  const [activityLoading, setActivityLoading] = useState(true)

  const loadSummary = async () => {
    setIsLoading(true); setError(null)
    try {
      const [summaryRes, profileRes] = await Promise.all([
        apiClient.get<DashboardSummary>('/dashboard/summary/'),
        apiClient.get<SchoolProfilePayload>('/school/profile/').catch(() => null),
      ])
      setData(summaryRes.data)
      setSchoolName(
        profileRes?.data?.profile?.school_name ||
        profileRes?.data?.tenant?.name ||
        profileRes?.data?.tenant?.schema ||
        null
      )
    } catch { setError('Unable to load dashboard. Verify tenant login and module access.') }
    finally { setIsLoading(false) }
  }

  const loadActivity = async () => {
    setActivityLoading(true)
    try {
      const [ordersRes, reversalsRes, writeoffsRes] = await Promise.allSettled([
        apiClient.get('/store/orders/'),
        apiClient.get('/finance/payment-reversals/'),
        apiClient.get('/finance/write-offs/'),
      ])
      const allItems: ActivityItem[] = []
      if (ordersRes.status === 'fulfilled') {
        const orders: any[] = ordersRes.value.data.results ?? ordersRes.value.data
        for (const o of orders) allItems.push({ id: o.id, type: 'store_order', label: `${o.request_code || `REQ-#${o.id}`}: ${o.title}`, sub: `By ${o.requested_by_name || '—'} · Sent to: ${o.send_to}`, status: o.status, createdAt: o.created_at, route: '/modules/store', needsApproval: o.status === 'PENDING' })
      }
      if (reversalsRes.status === 'fulfilled') {
        const reversals: any[] = reversalsRes.value.data.results ?? reversalsRes.value.data
        for (const r of reversals) allItems.push({ id: r.id, type: 'reversal', label: `Payment Reversal #${r.id}`, sub: r.reason ? r.reason.slice(0, 80) : 'No reason provided', status: r.status, createdAt: r.requested_at, route: '/modules/finance/payments', needsApproval: r.status === 'PENDING' })
      }
      if (writeoffsRes.status === 'fulfilled') {
        const writeoffs: any[] = writeoffsRes.value.data.results ?? writeoffsRes.value.data
        for (const w of writeoffs) allItems.push({ id: w.id, type: 'writeoff', label: `Write-off Request #${w.id}`, sub: w.reason ? w.reason.slice(0, 80) : 'No reason provided', status: w.status, createdAt: w.requested_at || w.created_at, route: '/modules/finance/payments', needsApproval: w.status === 'PENDING' })
      }
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setActivity({ todayItems: allItems, pendingItems: allItems.filter(i => i.needsApproval) })
    } catch { /* silently fail */ }
    finally { setActivityLoading(false) }
  }

  useEffect(() => {
    void loadSummary()
    void loadActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const assignedModuleKeys = useMemo(() => {
    if (!data) return []
    const combined = [
      ...data.modules.map(k => normalizeModuleKey(k)),
      ...data.modules_detail.map(item => normalizeModuleKey(item.key)),
    ]
    return Array.from(new Set(combined)).filter(k => k !== 'CORE').filter(k => isBackendModuleEnabled(k) || k === 'ASSETS')
  }, [data])

  const assignedSet = useMemo(() => new Set(assignedModuleKeys), [assignedModuleKeys])

  const financeBreakdownData = useMemo(() => {
    const finance = data?.summary?.finance
    if (!finance) return []
    return [
      { name: 'Billed', value: Number(finance.revenue_billed || 0), color: '#38bdf8' },
      { name: 'Collected', value: Number(finance.cash_collected || 0), color: '#34d399' },
      { name: 'Expenses', value: Number(finance.total_expenses || 0), color: '#f59e0b' },
      { name: 'Outstanding', value: Number(finance.outstanding_receivables || 0), color: '#fb7185' },
    ]
  }, [data])

  const moduleSummaryChartData = useMemo(
    () => Object.entries(data?.summary ?? {}).map(([key, values]) => ({
      module: MODULE_LABELS[normalizeModuleKey(key)] ?? normalizeModuleKey(key),
      total: Object.values(values).reduce((sum, v) => sum + Number(v || 0), 0),
    })),
    [data]
  )

  const todaysTasks = useMemo(() => {
    if (!data) return []
    const tasks: Array<{ title: string; detail: string; route: string }> = []
    const finance = data.summary.finance
    const admissions = data.summary.admissions
    const students = data.summary.students
    if (admissions && Number(admissions.applications || 0) > Number(admissions.enrolled || 0)) {
      tasks.push({ title: 'Review pending admissions', detail: `${Math.max(Number(admissions.applications || 0) - Number(admissions.enrolled || 0), 0)} applications are not yet enrolled.`, route: '/modules/admissions/dashboard' })
    }
    if (finance && Number(finance.outstanding_receivables || 0) > 0) {
      tasks.push({ title: 'Follow up outstanding balances', detail: `Outstanding receivables: Ksh ${Number(finance.outstanding_receivables || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`, route: '/modules/finance/reports' })
    }
    if (students && Number(students.active || 0) === 0) {
      tasks.push({ title: 'Activate student onboarding', detail: 'No active students detected for this tenant.', route: '/modules/students/admissions' })
    }
    return tasks
  }, [data])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-30 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Rynaty School Management</p>
            <h1 className="text-xl font-display font-semibold text-white">
              {schoolName ?? tenantId ?? 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-slate-500">{username}</span>
            <button onClick={() => void loadSummary()} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 transition flex items-center gap-1.5">
              <RefreshCw size={12} /> Refresh
            </button>
            <button onClick={handleLogout} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 transition">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">

        {isLoading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-400 animate-pulse">Loading dashboard...</p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* KPI Strip */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {[
                { label: 'Active Students', value: data.summary.students?.active ?? 0, tone: 'text-sky-300' },
                { label: 'Applications', value: data.summary.admissions?.applications ?? 0, tone: 'text-violet-300' },
                { label: 'Outstanding (Ksh)', value: data.summary.finance?.outstanding_receivables ?? 0, tone: 'text-rose-300', isMoney: true },
                { label: 'Assigned Modules', value: assignedModuleKeys.length, tone: 'text-emerald-300' },
                { label: 'System Areas', value: SYSTEM_GROUPS.length, tone: 'text-amber-300' },
              ].map(card => (
                <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                  <p className={`mt-1.5 text-2xl font-semibold ${card.tone}`}>
                    {card.isMoney
                      ? `${Number(card.value).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`
                      : Number(card.value).toLocaleString()}
                  </p>
                </article>
              ))}
            </section>

            {/* Quick Actions */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {QUICK_ACTIONS.map(action => {
                  const enabled = assignedSet.has(action.module)
                  return (
                    <button
                      key={action.label}
                      onClick={() => enabled && navigate(action.route)}
                      disabled={!enabled}
                      className={`rounded-xl border px-3 py-3 text-xs font-semibold text-center transition ${
                        enabled
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400'
                          : 'border-slate-800 bg-slate-900/30 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* System Groups */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-display font-semibold text-white">System Areas</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Click any area to expand and access its modules.</p>
                </div>
                <span className="text-xs text-slate-500">{assignedModuleKeys.length} modules assigned</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {SYSTEM_GROUPS.map(group => (
                  <SystemGroupCard
                    key={group.key}
                    group={group}
                    assignedKeys={assignedSet}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            </section>

            {/* Charts */}
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Module Activity Snapshot</h2>
                <p className="mt-1 text-xs text-slate-500">Combined totals across active module summaries.</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleSummaryChartData}>
                      <XAxis dataKey="module" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="total" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Finance Breakdown</h2>
                <p className="mt-1 text-xs text-slate-500">Available when Finance module is assigned.</p>
                <div className="mt-4 h-64">
                  {financeBreakdownData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-600">No finance data available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={financeBreakdownData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                          {financeBreakdownData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {financeBreakdownData.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {financeBreakdownData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span>{d.name}: <span className="text-slate-200 font-medium">Ksh {Number(d.value).toLocaleString('en-KE', { minimumFractionDigits: 0 })}</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Summary details */}
            {Object.keys(data.summary).length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">Summary Highlights</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(data.summary).map(([key, values]) => (
                    <article key={key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 mb-3">
                        {MODULE_LABELS[normalizeModuleKey(key)] ?? normalizeModuleKey(key)}
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(values).map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5">
                            <span className="text-xs text-slate-400">{label.replace(/_/g, ' ')}</span>
                            <span className="text-xs font-semibold text-slate-100">{Number(value).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Activity & Tasks */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Tasks & Requests</h2>
              <p className="mt-0.5 text-xs text-slate-500">Store requests and items awaiting approval.</p>
            </div>
            <button onClick={() => void loadActivity()} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {activityLoading ? (
            <p className="text-sm text-slate-500 animate-pulse">Loading activity...</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={13} className="text-sky-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">All Requests</span>
                  <span className="ml-auto text-[10px] font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full">{activity.todayItems.length}</span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {activity.todayItems.length === 0
                    ? <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-500 text-center">No requests found.</div>
                    : activity.todayItems.map(item => <ActivityCard key={`all-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} />)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={13} className="text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Needs Approval</span>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${activity.pendingItems.length > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/40 text-slate-500'}`}>{activity.pendingItems.length}</span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {activity.pendingItems.length === 0
                    ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400 text-center flex items-center justify-center gap-2"><CheckCircle2 size={13} /> All caught up! No pending approvals.</div>
                    : activity.pendingItems.map(item => <ActivityCard key={`pending-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} highlight />)}
                </div>
              </div>
            </div>
          )}

          {todaysTasks.length > 0 && (
            <div className="mt-5 border-t border-slate-800 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">General Priorities</p>
              <div className="grid gap-2 md:grid-cols-2">
                {todaysTasks.map(task => (
                  <button key={`${task.title}-${task.route}`} type="button" className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-emerald-400" onClick={() => navigate(task.route)}>
                    <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{task.detail}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
