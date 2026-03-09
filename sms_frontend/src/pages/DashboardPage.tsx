import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertCircle, ArrowRight, CheckCircle2, Clock, RefreshCw, ShoppingCart, Undo2 } from 'lucide-react'
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
  tenant?: {
    name?: string | null
    schema?: string | null
  }
  profile?: {
    school_name?: string | null
  } | null
}

type ActivityItem = {
  id: number
  type: 'store_order' | 'reversal' | 'writeoff'
  label: string
  sub: string
  status: string
  createdAt: string
  route: string
  needsApproval: boolean
}

type ActivityData = {
  todayItems: ActivityItem[]
  pendingItems: ActivityItem[]
}

const MODULE_OPERATIONAL_ROUTES: Record<string, string> = {
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
  STUDENTS: 'Students',
  ADMISSIONS: 'Admissions',
  FINANCE: 'Finance',
  ACADEMICS: 'Academics',
  HR: 'Human Resources',
  STAFF: 'Staff Management',
  COMMUNICATION: 'Communication',
  LIBRARY: 'Library',
  PARENTS: 'Parent Portal',
  ASSETS: 'Assets',
  STORE: 'Store & Inventory',
  DISPENSARY: 'Dispensary',
  CLOCKIN: 'Clock In / Out',
  TIMETABLE: 'Timetable',
  TRANSPORT: 'Transport',
  VISITOR_MGMT: 'Visitor Management',
  EXAMINATIONS: 'Examinations',
  ALUMNI: 'Alumni',
  HOSTEL: 'Hostel',
  PTM: 'Parent-Teacher Meetings',
  SPORTS: 'Sports',
  CAFETERIA: 'Cafeteria',
  CURRICULUM: 'Curriculum',
  MAINTENANCE: 'Maintenance',
  ELEARNING: 'E-Learning',
  ANALYTICS: 'Analytics',
  REPORTING: 'Reporting',
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  STUDENTS: 'Directory, attendance, behavior, medical and student documents.',
  ADMISSIONS: 'Applications, reviews, interviews, decisions and enrollment.',
  FINANCE: 'Invoices, payments, expenses, reconciliation and reports.',
  ACADEMICS: 'Structure, gradebook, report cards, assignments and calendar.',
  PARENTS: 'Guardian-facing communication, academics and finance visibility.',
  PARENT_PORTAL: 'Guardian-facing communication, academics and finance visibility.',
  COMMUNICATION: 'Messaging, announcements, templates and channel analytics.',
  STAFF: 'Staff profiles, attendance, performance and records.',
  HR: 'Organization, payroll, leave, recruitment and training.',
  LIBRARY: 'Catalog, circulation, reservations, fines and reports.',
  ASSETS: 'Asset register, inventory tracking and lifecycle controls.',
  STORE: 'Food and office inventory, stock movements, reorder alerts and order requests.',
  DISPENSARY: 'Student clinic visits, prescriptions, medication dispensing and referrals.',
  CLOCKIN: 'Staff and student clock-in/out tracking and attendance records.',
  TIMETABLE: 'Class schedules, room allocation and period management.',
  TRANSPORT: 'Routes, vehicles, drivers and student transport assignment.',
  VISITOR_MGMT: 'Visitor registration, badges, appointments and gate logs.',
  EXAMINATIONS: 'Exam scheduling, marking schemes, results and transcripts.',
  ALUMNI: 'Alumni directory, events, donations and engagement tracking.',
  HOSTEL: 'Dormitory rooms, allocation, fees and student welfare.',
  PTM: 'Parent-teacher meeting scheduling, slots and feedback.',
  SPORTS: 'Teams, fixtures, results and student sports participation.',
  CAFETERIA: 'Meal plans, orders, stock and cafeteria billing.',
  CURRICULUM: 'Syllabus planning, learning objectives and coverage tracking.',
  MAINTENANCE: 'Maintenance requests, work orders and facility management.',
  ELEARNING: 'Online courses, content delivery and learner progress.',
  ANALYTICS: 'Cross-module data insights, trends and KPI dashboards.',
  REPORTING: 'Scheduled and on-demand reports across all modules.',
}

const MODULE_DISPLAY_ORDER = [
  'STUDENTS',
  'ADMISSIONS',
  'ACADEMICS',
  'FINANCE',
  'PARENTS',
  'COMMUNICATION',
  'STAFF',
  'HR',
  'LIBRARY',
  'STORE',
  'DISPENSARY',
  'CLOCKIN',
  'TIMETABLE',
  'TRANSPORT',
  'VISITOR_MGMT',
  'EXAMINATIONS',
  'ALUMNI',
  'HOSTEL',
  'PTM',
  'SPORTS',
  'CAFETERIA',
  'CURRICULUM',
  'MAINTENANCE',
  'ELEARNING',
  'ANALYTICS',
  'REPORTING',
]

const MODULE_KEY_ALIASES: Record<string, string> = {
  PARENT_PORTAL: 'PARENTS',
}

const normalizeModuleKey = (moduleKey: string) => {
  const normalized = (moduleKey || '').toUpperCase()
  return MODULE_KEY_ALIASES[normalized] ?? normalized
}

const ACTIVITY_TYPE_CONFIG = {
  store_order: { icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Store Order' },
  reversal: { icon: Undo2, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Payment Reversal' },
  writeoff: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Write-off' },
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300',
  APPROVED: 'bg-emerald-500/20 text-emerald-300',
  REJECTED: 'bg-rose-500/20 text-rose-300',
  FULFILLED: 'bg-sky-500/20 text-sky-300',
}

function ActivityCard({ item, onNavigate, highlight }: { item: ActivityItem; onNavigate: () => void; highlight?: boolean }) {
  const cfg = ACTIVITY_TYPE_CONFIG[item.type]
  const Icon = cfg.icon
  const time = item.createdAt
    ? new Date(item.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3.5 transition cursor-pointer hover:border-emerald-500/50 ${highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-950/40'}`}
      onClick={onNavigate}
    >
      <div className={`flex-shrink-0 rounded-lg p-2 ${cfg.bg}`}>
        <Icon size={14} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-slate-200 leading-tight truncate">{item.label}</p>
          <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_BADGE[item.status] || 'bg-slate-700 text-slate-400'}`}>
            {item.status}
          </span>
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
    setIsLoading(true)
    setError(null)
    try {
      const [summaryRes, profileRes] = await Promise.all([
        apiClient.get<DashboardSummary>('/dashboard/summary/'),
        apiClient.get<SchoolProfilePayload>('/school/profile/').catch(() => null),
      ])
      setData(summaryRes.data)
      const resolvedSchoolName =
        profileRes?.data?.profile?.school_name ||
        profileRes?.data?.tenant?.name ||
        profileRes?.data?.tenant?.schema ||
        null
      setSchoolName(resolvedSchoolName)
    } catch {
      setError('Unable to load dashboard summary. Verify tenant login and module access.')
    } finally {
      setIsLoading(false)
    }
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
        for (const o of orders) {
          allItems.push({
            id: o.id,
            type: 'store_order',
            label: `${o.request_code || `REQ-#${o.id}`}: ${o.title}`,
            sub: `By ${o.requested_by_name || '—'} · Sent to: ${o.send_to}`,
            status: o.status,
            createdAt: o.created_at,
            route: '/modules/store',
            needsApproval: o.status === 'PENDING',
          })
        }
      }

      if (reversalsRes.status === 'fulfilled') {
        const reversals: any[] = reversalsRes.value.data.results ?? reversalsRes.value.data
        for (const r of reversals) {
          allItems.push({
            id: r.id,
            type: 'reversal',
            label: `Payment Reversal #${r.id}`,
            sub: r.reason ? r.reason.slice(0, 80) : 'No reason provided',
            status: r.status,
            createdAt: r.requested_at,
            route: '/modules/finance/payments',
            needsApproval: r.status === 'PENDING',
          })
        }
      }

      if (writeoffsRes.status === 'fulfilled') {
        const writeoffs: any[] = writeoffsRes.value.data.results ?? writeoffsRes.value.data
        for (const w of writeoffs) {
          allItems.push({
            id: w.id,
            type: 'writeoff',
            label: `Write-off Request #${w.id}`,
            sub: w.reason ? w.reason.slice(0, 80) : 'No reason provided',
            status: w.status,
            createdAt: w.requested_at || w.created_at,
            route: '/modules/finance/payments',
            needsApproval: w.status === 'PENDING',
          })
        }
      }

      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setActivity({
        todayItems: allItems,
        pendingItems: allItems.filter((i) => i.needsApproval),
      })
    } catch {
      // silently fail — activity panel is non-critical
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    void loadSummary().then(() => {
      if (!isMounted) return
    })
    void loadActivity()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const assignedModuleKeys = useMemo(() => {
    if (!data) return []
    const combined = [
      ...data.modules.map((key) => normalizeModuleKey(key)),
      ...data.modules_detail.map((item) => normalizeModuleKey(item.key)),
    ]
    return Array.from(new Set(combined))
      .filter((key) => key !== 'CORE')
      .filter((key) => isBackendModuleEnabled(key) || key === 'ASSETS')
      .sort((a, b) => {
        const ai = MODULE_DISPLAY_ORDER.indexOf(a)
        const bi = MODULE_DISPLAY_ORDER.indexOf(b)
        if (ai === -1 && bi === -1) return a.localeCompare(b)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
  }, [data])

  const dashboardModuleKeys = useMemo(() => {
    const base = MODULE_DISPLAY_ORDER.filter((key) => isBackendModuleEnabled(key))
    const extraAssigned = assignedModuleKeys.filter((key) => !base.includes(key))
    return [...base, ...extraAssigned]
  }, [assignedModuleKeys])

  const displayUnavailableModules = (data?.unavailable_modules ?? []).filter(
    (key) => !MODULE_OPERATIONAL_ROUTES[key],
  )

  const statsCards = data
    ? [
        {
          label: 'Assigned modules',
          value: assignedModuleKeys.length,
          tone: 'text-emerald-300',
        },
        {
          label: 'Total module areas',
          value: dashboardModuleKeys.length,
          tone: 'text-violet-300',
        },
        {
          label: 'Students active',
          value: data.summary.students?.active ?? 0,
          tone: 'text-sky-300',
        },
        {
          label: 'Admissions applications',
          value: data.summary.admissions?.applications ?? 0,
          tone: 'text-amber-300',
        },
        {
          label: 'Outstanding receivables',
          value: data.summary.finance?.outstanding_receivables ?? 0,
          tone: 'text-rose-300',
          isMoney: true,
        },
      ]
    : []

  const moduleSummaryChartData = useMemo(
    () =>
      Object.entries(data?.summary ?? {}).map(([moduleKey, values]) => ({
        module: MODULE_LABELS[moduleKey] ?? moduleKey,
        total: Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0),
      })),
    [data],
  )

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

  const todaysTasks = useMemo(() => {
    if (!data) return []
    const tasks: Array<{ title: string; detail: string; route: string }> = []
    const finance = data.summary.finance
    const admissions = data.summary.admissions
    const students = data.summary.students

    if (admissions && Number(admissions.applications || 0) > Number(admissions.enrolled || 0)) {
      tasks.push({
        title: 'Review pending admissions',
        detail: `${Math.max(Number(admissions.applications || 0) - Number(admissions.enrolled || 0), 0)} applications are not yet enrolled.`,
        route: '/modules/admissions/dashboard',
      })
    }

    if (finance && Number(finance.outstanding_receivables || 0) > 0) {
      tasks.push({
        title: 'Follow up outstanding balances',
        detail: `Outstanding receivables: Ksh ${Number(finance.outstanding_receivables || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`,
        route: '/modules/finance/reports',
      })
    }

    if (students && Number(students.active || 0) === 0) {
      tasks.push({
        title: 'Activate student onboarding',
        detail: 'No active students detected for this tenant.',
        route: '/modules/students/admissions',
      })
    }

    if (tasks.length === 0) {
      tasks.push({
        title: 'System health check complete',
        detail: 'No urgent items from current dashboard metrics.',
        route: '/dashboard',
      })
    }

    return tasks
  }, [data])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Main Dashboard</p>
            <h1 className="text-2xl font-display font-semibold">Welcome back{username ? `, ${username}` : ''}</h1>
            <p className="text-sm text-slate-400">
              School: {schoolName ?? tenantId ?? 'tenant'} | Tenant: {tenantId ?? 'unresolved'}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 sm:w-auto"
              onClick={() => void loadSummary()}
            >
              Refresh
            </button>
            <button
              className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 sm:w-auto"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
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
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {statsCards.map((card) => (
                <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                  <p className={`mt-2 text-3xl font-semibold ${card.tone}`}>
                    {card.isMoney ? `Ksh ${Number(card.value).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : Number(card.value).toLocaleString()}
                  </p>
                </article>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-display font-semibold">Summary Highlights</h2>
              <p className="mt-2 text-sm text-slate-400">
                Real-time operational metrics grouped by active module areas.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(data.summary).map(([key, values]) => (
                  <article
                    key={key}
                    className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950/80 to-slate-900/60 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                      {MODULE_LABELS[normalizeModuleKey(key)] ?? normalizeModuleKey(key)}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      {Object.entries(values).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                        >
                          <span className="text-slate-400">{label.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-slate-100">{Number(value).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-display font-semibold">Module Activity Snapshot</h2>
                <p className="mt-2 text-sm text-slate-400">Combined totals across visible module summaries.</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleSummaryChartData}>
                      <XAxis dataKey="module" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#34d399" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-display font-semibold">Finance Mix</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Available when Finance module is assigned.
                </p>
                <div className="mt-4 h-72">
                  {financeBreakdownData.length === 0 ? (
                    <p className="text-sm text-slate-400">No finance data available for this user.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={financeBreakdownData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96}>
                          {financeBreakdownData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-display font-semibold">Primary Workflows</h2>
              <p className="mt-2 text-sm text-slate-400">
                Start here for day-to-day operations based on your assigned modules.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dashboardModuleKeys.length === 0 ? (
                  <p className="text-sm text-amber-200">
                    No operational modules available for this user yet. Ask tenant admin to assign module access.
                  </p>
                ) : null}
                {dashboardModuleKeys.map((moduleKey) => {
                  const isAssigned = assignedModuleKeys.includes(moduleKey)
                  return (
                  <article
                    key={moduleKey}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{MODULE_LABELS[moduleKey] ?? moduleKey}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isAssigned ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/40 text-slate-300'}`}>
                        {isAssigned ? 'Assigned' : 'Not assigned'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {MODULE_DESCRIPTIONS[moduleKey] ?? 'Module workspace.'}
                    </p>
                    <button
                      className="mt-4 rounded-lg border border-emerald-500/60 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-400 disabled:hover:bg-transparent"
                      onClick={() => {
                        const route = MODULE_OPERATIONAL_ROUTES[moduleKey]
                        if (route) navigate(route)
                      }}
                      disabled={!isAssigned || !MODULE_OPERATIONAL_ROUTES[moduleKey]}
                    >
                      {isAssigned && MODULE_OPERATIONAL_ROUTES[moduleKey]
                        ? `Open ${MODULE_LABELS[moduleKey] ?? moduleKey}`
                        : 'Assign access to open'}
                    </button>
                  </article>
                )})}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-display font-semibold">All Module Navigation</h2>
              <p className="mt-2 text-sm text-slate-400">Quick direct links to all enabled module areas.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {dashboardModuleKeys.map((moduleKey) => (
                  <button
                    key={`chip-${moduleKey}`}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:border-slate-700"
                    onClick={() => {
                      const route = MODULE_OPERATIONAL_ROUTES[moduleKey]
                      if (route) navigate(route)
                    }}
                    disabled={!assignedModuleKeys.includes(moduleKey) || !MODULE_OPERATIONAL_ROUTES[moduleKey]}
                  >
                    {MODULE_LABELS[moduleKey] ?? moduleKey}
                  </button>
                ))}
              </div>
              {displayUnavailableModules.length > 0 ? (
                <p className="mt-4 text-xs text-amber-300">
                  Unavailable modules: {displayUnavailableModules.join(', ')}
                </p>
              ) : null}
            </section>

          </>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-display font-semibold">Today's Tasks & Requests</h2>
              <p className="mt-1 text-sm text-slate-400">All store requests and items awaiting your approval.</p>
            </div>
            <button
              onClick={() => void loadActivity()}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {activityLoading ? (
            <div className="mt-6 text-center text-sm text-slate-500">Loading activity...</div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {/* All Requests */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={14} className="text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-400">All Requests</span>
                  <span className="ml-auto text-xs font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full">
                    {activity.todayItems.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {activity.todayItems.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-500 text-center">
                      No store orders or requests found.
                    </div>
                  ) : activity.todayItems.map((item) => (
                    <ActivityCard key={`all-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} />
                  ))}
                </div>
              </div>

              {/* Needs Approval */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={14} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Needs Approval</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${activity.pendingItems.length > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/40 text-slate-500'}`}>
                    {activity.pendingItems.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {activity.pendingItems.length === 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400 text-center flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} />
                      No pending approvals. All caught up!
                    </div>
                  ) : activity.pendingItems.map((item) => (
                    <ActivityCard key={`pending-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} highlight />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* General metric-based tasks */}
          {todaysTasks.some(t => t.route !== '/dashboard') && (
            <div className="mt-5 border-t border-slate-800 pt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">General Priorities</p>
              <div className="grid gap-2 md:grid-cols-2">
                {todaysTasks.filter(t => t.route !== '/dashboard').map((task) => (
                  <button
                    key={`${task.title}-${task.route}`}
                    type="button"
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-emerald-400"
                    onClick={() => navigate(task.route)}
                  >
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
