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

const ROLE_QUICK_ACTIONS: Record<string, { label: string; route: string; module: string; icon?: string }[]> = {
  TENANT_SUPER_ADMIN: [
    { label: 'Approvals', route: '/dashboard/approvals', module: 'CORE', icon: '⚡' },
    { label: 'Admit Student', route: '/modules/admissions/dashboard', module: 'ADMISSIONS', icon: '🎓' },
    { label: 'Create Invoice', route: '/modules/finance/invoices', module: 'FINANCE', icon: '📄' },
    { label: 'Send Announcement', route: '/modules/communication/dashboard', module: 'COMMUNICATION', icon: '📢' },
    { label: 'View Reports', route: '/modules/analytics/dashboard', module: 'ANALYTICS', icon: '📊' },
    { label: 'System Settings', route: '/settings/school-profile', module: 'CORE', icon: '⚙️' },
  ],
  ADMIN: [
    { label: 'Approvals', route: '/dashboard/approvals', module: 'CORE', icon: '⚡' },
    { label: 'Admit Student', route: '/modules/admissions/dashboard', module: 'ADMISSIONS', icon: '🎓' },
    { label: 'Create Invoice', route: '/modules/finance/invoices', module: 'FINANCE', icon: '📄' },
    { label: 'Send Announcement', route: '/modules/communication/dashboard', module: 'COMMUNICATION', icon: '📢' },
    { label: 'Add Exam', route: '/modules/examinations/dashboard', module: 'EXAMINATIONS', icon: '📝' },
    { label: 'Register Visitor', route: '/modules/visitors/dashboard', module: 'VISITOR_MGMT', icon: '🪪' },
  ],
  ACCOUNTANT: [
    { label: 'Create Invoice', route: '/modules/finance/invoices', module: 'FINANCE', icon: '📄' },
    { label: 'Record Payment', route: '/modules/finance/payments', module: 'FINANCE', icon: '💰' },
    { label: 'View Outstanding', route: '/modules/finance/arrears', module: 'FINANCE', icon: '⚠️' },
    { label: 'Fee Structure', route: '/modules/finance/fees', module: 'FINANCE', icon: '📋' },
    { label: 'Financial Reports', route: '/modules/finance/audit-reports', module: 'FINANCE', icon: '📊' },
    { label: 'Daily Collections', route: '/modules/finance/payments', module: 'FINANCE', icon: '💳' },
  ],
  TEACHER: [
    { label: 'Mark Attendance', route: '/modules/academics/attendance', module: 'ACADEMICS', icon: '✅' },
    { label: 'Enter Marks', route: '/modules/examinations/marks', module: 'EXAMINATIONS', icon: '📝' },
    { label: 'View Timetable', route: '/modules/timetable/grid', module: 'TIMETABLE', icon: '📅' },
    { label: 'My Classes', route: '/modules/academics/dashboard', module: 'ACADEMICS', icon: '🏫' },
    { label: 'Student Records', route: '/modules/students', module: 'STUDENTS', icon: '👤' },
    { label: 'Send Message', route: '/modules/communication/messaging', module: 'COMMUNICATION', icon: '💬' },
  ],
  DEFAULT: [
    { label: 'Admit Student', route: '/modules/admissions/dashboard', module: 'ADMISSIONS', icon: '🎓' },
    { label: 'Record Attendance', route: '/modules/academics/attendance', module: 'ACADEMICS', icon: '✅' },
    { label: 'Create Invoice', route: '/modules/finance/invoices', module: 'FINANCE', icon: '📄' },
    { label: 'Send Announcement', route: '/modules/communication/dashboard', module: 'COMMUNICATION', icon: '📢' },
    { label: 'Add Examination', route: '/modules/examinations/dashboard', module: 'EXAMINATIONS', icon: '📝' },
    { label: 'Register Visitor', route: '/modules/visitors/dashboard', module: 'VISITOR_MGMT', icon: '🪪' },
  ],
}

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
      className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer
        ${highlight
          ? 'border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-500/50'
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
        }`}
      onClick={onNavigate}
    >
      <div className={`flex-shrink-0 rounded-xl p-2 ${cfg.bg}`}>
        <Icon size={13} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-semibold text-slate-200 leading-tight truncate">{item.label}</p>
          <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[item.status] || 'bg-slate-700/80 text-slate-400'}`}>
            {item.status}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-600 truncate">{item.sub}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-700">{cfg.label}{time && ` · ${time}`}</span>
          <ArrowRight size={10} className="text-slate-700 group-hover:text-slate-500 transition" />
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
  const hasAny = assignedCount > 0

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
        open ? '' : 'hover:border-white/[0.1]'
      }`}
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: open ? group.borderColor.replace('border-', '').replace('/30', '') + '50' : 'rgba(255,255,255,0.07)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left group"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${group.bgColor}`}
          style={{ flexShrink: 0 }}
        >
          <Icon className={`w-[18px] h-[18px] ${group.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-100 font-display">{group.label}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              hasAny ? `${group.bgColor} ${group.color}` : 'bg-white/[0.04] text-slate-600'
            }`}>
              {assignedCount}/{group.modules.length}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed line-clamp-1">{group.description}</p>
        </div>
        <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all
          ${open ? 'bg-white/[0.07] rotate-0' : 'bg-transparent group-hover:bg-white/[0.04]'}`}>
          {open
            ? <ChevronDown size={13} className="text-slate-400" />
            : <ChevronRight size={13} className="text-slate-600" />
          }
        </div>
      </button>

      {open && (
        <div
          className="px-5 pb-5 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {group.modules.map(modKey => {
            const isAssigned = assignedKeys.has(modKey)
            const route = MODULE_ROUTES[modKey]
            return (
              <button
                key={modKey}
                onClick={() => isAssigned && route && onNavigate(route)}
                disabled={!isAssigned || !route}
                className={`rounded-xl px-3 py-2.5 text-left transition-all ${
                  isAssigned
                    ? `${group.bgColor} ${group.color} border hover:opacity-90 hover:scale-[1.02]`
                    : 'bg-white/[0.02] text-slate-700 cursor-not-allowed border border-white/[0.04]'
                } ${isAssigned ? group.borderColor : ''}`}
              >
                <p className="text-[11px] font-semibold">{MODULE_LABELS[modKey] ?? modKey}</p>
                <p className={`text-[10px] mt-0.5 ${isAssigned ? 'opacity-60' : 'text-slate-800'}`}>
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
  const userRole = useAuthStore((state) => state.role)

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

  // Greeting
  const greeting = (() => {
    const h = new Date().getHours()
    const name = username ?? 'there'
    if (h < 12) return { text: `Good morning, ${name}`, emoji: '☀️' }
    if (h < 17) return { text: `Good afternoon, ${name}`, emoji: '⛅' }
    return { text: `Good evening, ${name}`, emoji: '🌙' }
  })()

  const KPI_CARDS = data ? [
    { label: 'Active Students',   value: data.summary.students?.active ?? 0,                     color: '#38bdf8', icon: '🎓', isMoney: false },
    { label: 'Applications',      value: data.summary.admissions?.applications ?? 0,              color: '#a78bfa', icon: '📋', isMoney: false },
    { label: 'Outstanding (Ksh)', value: data.summary.finance?.outstanding_receivables ?? 0,      color: '#fb7185', icon: '💰', isMoney: true  },
    { label: 'Active Modules',    value: assignedModuleKeys.length,                               color: '#34d399', icon: '📦', isMoney: false },
    { label: 'System Areas',      value: SYSTEM_GROUPS.length,                                    color: '#fbbf24', icon: '🏛️', isMoney: false },
  ] : []

  return (
    <div className="min-h-screen text-white" style={{ background: '#070b12' }}>
      <main className="mx-auto max-w-6xl flex flex-col gap-6 px-5 py-7 sm:px-8">

        {/* ── Greeting Header ─────────────────────────── */}
        <header className="flex items-start justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1"
              style={{ color: 'rgba(16,185,129,0.7)' }}>
              Rynaty School Management
            </p>
            <h1 className="text-2xl font-display font-bold text-white leading-tight">
              {greeting.emoji} {greeting.text}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: '#475569' }}>
              {schoolName ?? tenantId ?? 'Dashboard'} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => void loadSummary()}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#94a3b8' }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </header>

        {/* ── Error ───────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl px-5 py-4 text-[13px] text-rose-300 animate-fade-in"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* ── Skeleton ────────────────────────────────── */}
        {isLoading && !data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl h-20 skeleton" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* ── KPI Strip ───────────────────────────── */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 animate-fade-in-up delay-100">
              {KPI_CARDS.map((card, i) => (
                <article
                  key={card.label}
                  className={`relative rounded-2xl p-4 overflow-hidden animate-scale-in`}
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    animationDelay: `${i * 60}ms`,
                    borderLeft: `3px solid ${card.color}40`,
                  }}
                >
                  {/* Glow */}
                  <div
                    className="absolute top-0 right-0 w-16 h-16 rounded-full pointer-events-none opacity-10 blur-xl"
                    style={{ background: card.color, transform: 'translate(20%,-20%)' }}
                  />
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2 relative"
                    style={{ color: 'rgba(148,163,184,0.7)' }}>
                    {card.label}
                  </p>
                  <p
                    className="text-[22px] font-display font-bold relative leading-none"
                    style={{ color: card.color }}
                  >
                    {card.isMoney
                      ? Number(card.value).toLocaleString('en-KE', { notation: 'compact', maximumFractionDigits: 1 })
                      : Number(card.value).toLocaleString()
                    }
                  </p>
                </article>
              ))}
            </section>

            {/* ── Quick Actions ────────────────────────── */}
            {(() => {
              const roleKey = (userRole ?? 'DEFAULT').toUpperCase()
              const quickActions = ROLE_QUICK_ACTIONS[roleKey] ?? ROLE_QUICK_ACTIONS['DEFAULT']
              const roleLabel: Record<string, string> = {
                TENANT_SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin',
                TEACHER: 'Teacher', ACCOUNTANT: 'Accountant', DEFAULT: '',
              }
              return (
                <section
                  className="rounded-2xl p-5 animate-fade-in-up delay-200"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(251,191,36,0.12)' }}>
                        <Zap size={13} className="text-amber-400" />
                      </div>
                      <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-300">Quick Actions</h2>
                    </div>
                    {roleLabel[roleKey] && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}
                      >
                        {roleLabel[roleKey]}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {quickActions.map((action, i) => {
                      const enabled = action.module === 'CORE' || assignedSet.has(action.module)
                      return (
                        <button
                          key={action.label}
                          onClick={() => enabled && navigate(action.route)}
                          disabled={!enabled}
                          className={`group flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center transition-all duration-150 animate-scale-in
                            ${enabled
                              ? 'hover:scale-[1.04] active:scale-[0.98]'
                              : 'cursor-not-allowed opacity-35'
                            }`}
                          style={{
                            background: enabled ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${enabled ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                            animationDelay: `${i * 40 + 200}ms`,
                          }}
                          onMouseEnter={e => { if (enabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.12)' }}
                          onMouseLeave={e => { if (enabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.06)' }}
                        >
                          <span className="text-xl leading-none">{action.icon ?? '⚡'}</span>
                          <span className="text-[11px] font-semibold leading-tight text-slate-300 group-hover:text-white transition">
                            {action.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })()}

            {/* ── System Areas ─────────────────────────── */}
            <section className="animate-fade-in-up delay-300">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-display font-bold text-white">System Areas</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>Expand any area to access its modules.</p>
                </div>
                <span className="text-[11px]" style={{ color: '#334155' }}>
                  {assignedModuleKeys.length} modules assigned
                </span>
              </div>
              <div className="grid gap-2.5 md:grid-cols-2">
                {SYSTEM_GROUPS.map(group => (
                  <SystemGroupCard key={group.key} group={group} assignedKeys={assignedSet} onNavigate={navigate} />
                ))}
              </div>
            </section>

            {/* ── Charts ───────────────────────────────── */}
            <section className="grid gap-5 lg:grid-cols-2 animate-fade-in-up delay-400">
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em] mb-0.5">Activity Snapshot</h2>
                <p className="text-[11px] mb-5" style={{ color: '#475569' }}>Combined totals across active modules.</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleSummaryChartData} barSize={22}>
                      <XAxis dataKey="module" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip
                        contentStyle={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em] mb-0.5">Finance Breakdown</h2>
                <p className="text-[11px] mb-4" style={{ color: '#475569' }}>Available when Finance module is assigned.</p>
                <div className="h-56">
                  {financeBreakdownData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[12px]" style={{ color: '#334155' }}>
                      No finance data available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={financeBreakdownData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {financeBreakdownData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {financeBreakdownData.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {financeBreakdownData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span style={{ color: '#64748b' }}>{d.name}:</span>
                        <span className="text-slate-300 font-semibold">
                          {Number(d.value).toLocaleString('en-KE', { notation: 'compact', maximumFractionDigits: 1 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── Summary Highlights ───────────────────── */}
            {Object.keys(data.summary).length > 0 && (
              <section
                className="rounded-2xl p-5 animate-fade-in-up delay-500"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em] mb-5">Summary Highlights</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(data.summary).map(([key, values]) => (
                    <article
                      key={key}
                      className="rounded-xl p-4"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3"
                        style={{ color: 'rgba(16,185,129,0.8)' }}>
                        {MODULE_LABELS[normalizeModuleKey(key)] ?? normalizeModuleKey(key)}
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(values).map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-lg px-3 py-1.5"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <span className="text-[11px]" style={{ color: '#64748b' }}>{label.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] font-bold text-slate-200">{Number(value).toLocaleString()}</span>
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

        {/* ── Activity & Tasks ─────────────────────────── */}
        <section
          className="rounded-2xl p-5 animate-fade-in-up delay-400"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em]">Tasks & Requests</h2>
              <p className="mt-0.5 text-[11px]" style={{ color: '#475569' }}>Store orders and items awaiting approval.</p>
            </div>
            <button
              onClick={() => void loadActivity()}
              className="flex items-center gap-1.5 text-[12px] transition-all hover:opacity-80"
              style={{ color: '#475569' }}
            >
              <RefreshCw size={12} className={activityLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {activityLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={12} className="text-sky-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">All Requests</span>
                  <span className="ml-auto text-[9px] font-bold bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded-full">
                    {activity.todayItems.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activity.todayItems.length === 0
                    ? (
                      <div
                        className="rounded-2xl p-5 text-[12px] text-center"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#475569' }}
                      >
                        No requests found.
                      </div>
                    )
                    : activity.todayItems.map(item => (
                      <ActivityCard key={`all-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} />
                    ))
                  }
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={12} className="text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Needs Approval</span>
                  <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    activity.pendingItems.length > 0
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-white/[0.04] text-slate-600'
                  }`}>{activity.pendingItems.length}</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activity.pendingItems.length === 0
                    ? (
                      <div
                        className="rounded-2xl p-5 text-[12px] text-center flex items-center justify-center gap-2"
                        style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', color: 'rgba(16,185,129,0.7)' }}
                      >
                        <CheckCircle2 size={13} /> All caught up — no pending approvals.
                      </div>
                    )
                    : activity.pendingItems.map(item => (
                      <ActivityCard key={`pending-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} highlight />
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {todaysTasks.length > 0 && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#334155' }}>
                Action Required
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {todaysTasks.map(task => (
                  <button
                    key={`${task.title}-${task.route}`}
                    type="button"
                    className="group rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onClick={() => navigate(task.route)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  >
                    <p className="text-[13px] font-semibold text-slate-200 group-hover:text-white transition">{task.title}</p>
                    <p className="mt-1 text-[11px]" style={{ color: '#475569' }}>{task.detail}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Bottom padding */}
        <div className="h-4" />
      </main>
    </div>
  )
}
