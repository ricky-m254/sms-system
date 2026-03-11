import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import {
  CheckCircle2, XCircle, MessageSquarePlus, ExternalLink, RefreshCw,
  ChevronDown, ChevronUp, Clock, AlertTriangle, Loader2, Inbox,
  DollarSign, RotateCcw, SlidersHorizontal, Package, CalendarDays,
  BookOpen, LayoutGrid, Timer, ArrowRight, Zap, Filter, Search,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaChip {
  label: string
  value: string
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'rose'
  mono?: boolean
}

interface DetailRow {
  label: string
  value: string
  mono?: boolean
  wide?: boolean
}

interface ApprovalItem {
  id: number
  title: string
  subtitle: string
  chips: MetaChip[]
  details: DetailRow[]
  requestedBy: string
  requestedAt: string
  ageHours: number
  moduleRoute: string
  raw: Record<string, unknown>
}

type ActionMode = 'idle' | 'approving' | 'clarifying' | 'rejecting' | 'submitting' | 'done'

interface CategoryDef {
  key: string
  label: string
  shortLabel: string
  LucideIcon: React.ElementType
  accent: string           // tailwind color token e.g. 'rose'
  borderClass: string
  bgClass: string
  textClass: string
  badgeClass: string
  listUrl: string
  moduleRoute: string
  moduleLabel: string
  approveEndpoint: (id: number) => { method: 'post' | 'patch'; url: string }
  rejectEndpoint: (id: number) => { method: 'post' | 'patch'; url: string }
  approvePayload: (notes: string) => Record<string, string>
  rejectPayload: (notes: string) => Record<string, string>
  adapter: (raw: Record<string, unknown>[]) => ApprovalItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageHours(iso: string | null | undefined): number {
  if (!iso) return 0
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtKsh(v: number | string | null | undefined): string {
  const n = Number(v)
  if (isNaN(n)) return '—'
  return `Ksh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

function asStr(v: unknown): string {
  return v == null ? '—' : String(v)
}

function studentName(s: Record<string, unknown> | null | undefined): string {
  if (!s) return '—'
  const f = asStr(s.first_name), l = asStr(s.last_name)
  return `${f} ${l}`.trim() || asStr(s.admission_number)
}

// ─── Category Definitions ────────────────────────────────────────────────────

const CATEGORIES: CategoryDef[] = [
  {
    key: 'writeoffs',
    label: 'Finance Write-offs',
    shortLabel: 'Write-offs',
    LucideIcon: XCircle,
    accent: 'rose',
    borderClass: 'border-rose-500/30',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    listUrl: '/finance/write-offs/?status=PENDING&limit=50',
    moduleRoute: '/modules/finance/writeoffs',
    moduleLabel: 'Finance › Write-offs',
    approveEndpoint: (id) => ({ method: 'post', url: `/finance/write-offs/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/finance/write-offs/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const inv = r.invoice as Record<string, unknown> | null ?? {}
      const student = inv.student as Record<string, unknown> | null ?? null
      return {
        id: r.id as number,
        title: `Write-off Request — ${asStr(inv.invoice_number || r.invoice)}`,
        subtitle: `Student: ${studentName(student)}`,
        chips: [
          { label: 'Amount', value: fmtKsh(r.amount as string), color: 'red' },
          { label: 'Admission', value: asStr(student?.admission_number || '—'), mono: true },
          { label: 'Invoice', value: asStr(inv.invoice_number || r.invoice), mono: true },
        ],
        details: [
          { label: 'Student', value: studentName(student) },
          { label: 'Invoice #', value: asStr(inv.invoice_number || r.invoice), mono: true },
          { label: 'Write-off Amount', value: fmtKsh(r.amount as string) },
          { label: 'Reason', value: asStr(r.reason), wide: true },
          { label: 'Requested By', value: asStr(r.requested_by) },
          { label: 'Requested At', value: fmtDate(r.requested_at as string) },
          { label: 'Invoice Balance', value: fmtKsh(inv.balance as string) },
        ],
        requestedBy: asStr(r.requested_by),
        requestedAt: asStr(r.requested_at),
        ageHours: ageHours(r.requested_at as string),
        moduleRoute: '/modules/finance',
        raw: r,
      }
    }),
  },
  {
    key: 'reversals',
    label: 'Payment Reversals',
    shortLabel: 'Reversals',
    LucideIcon: RotateCcw,
    accent: 'orange',
    borderClass: 'border-orange-500/30',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    listUrl: '/finance/payment-reversals/?status=PENDING&limit=50',
    moduleRoute: '/modules/finance/payments',
    moduleLabel: 'Finance › Payments',
    approveEndpoint: (id) => ({ method: 'post', url: `/finance/payment-reversals/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/finance/payment-reversals/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const pmt = r.payment as Record<string, unknown> | null ?? {}
      const student = pmt.student as Record<string, unknown> | null ?? null
      return {
        id: r.id as number,
        title: `Reversal — Rcpt ${asStr(pmt.receipt_number || pmt.reference_number || r.payment)}`,
        subtitle: `Student: ${studentName(student)}`,
        chips: [
          { label: 'Amount', value: fmtKsh(pmt.amount_paid as string), color: 'amber' },
          { label: 'Receipt', value: asStr(pmt.receipt_number || '—'), mono: true },
          { label: 'Ref', value: asStr(pmt.reference_number || '—'), mono: true },
        ],
        details: [
          { label: 'Student', value: studentName(student) },
          { label: 'Receipt #', value: asStr(pmt.receipt_number), mono: true },
          { label: 'Reference', value: asStr(pmt.reference_number), mono: true },
          { label: 'Amount Paid', value: fmtKsh(pmt.amount_paid as string) },
          { label: 'Reversal Reason', value: asStr(r.reason), wide: true },
          { label: 'Requested By', value: asStr(r.requested_by) },
          { label: 'Requested At', value: fmtDate(r.requested_at as string) },
        ],
        requestedBy: asStr(r.requested_by),
        requestedAt: asStr(r.requested_at),
        ageHours: ageHours(r.requested_at as string),
        moduleRoute: '/modules/finance/payments',
        raw: r,
      }
    }),
  },
  {
    key: 'adjustments',
    label: 'Invoice Adjustments',
    shortLabel: 'Adjustments',
    LucideIcon: SlidersHorizontal,
    accent: 'amber',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    listUrl: '/finance/invoice-adjustments/?status=PENDING&limit=50',
    moduleRoute: '/modules/finance/adjustments',
    moduleLabel: 'Finance › Adjustments',
    approveEndpoint: (id) => ({ method: 'post', url: `/finance/invoice-adjustments/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/finance/invoice-adjustments/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const inv = r.invoice as Record<string, unknown> | null ?? {}
      const student = inv.student as Record<string, unknown> | null ?? null
      return {
        id: r.id as number,
        title: `Adjustment — ${asStr(inv.invoice_number || r.invoice)}`,
        subtitle: `${asStr(r.adjustment_type || 'CREDIT')} · Student: ${studentName(student)}`,
        chips: [
          { label: 'Type', value: asStr(r.adjustment_type || 'CREDIT'), color: 'amber' },
          { label: 'Amount', value: fmtKsh(r.amount as string), color: 'amber' },
          { label: 'Invoice', value: asStr(inv.invoice_number || r.invoice), mono: true },
        ],
        details: [
          { label: 'Student', value: studentName(student) },
          { label: 'Invoice #', value: asStr(inv.invoice_number || r.invoice), mono: true },
          { label: 'Adjustment Type', value: asStr(r.adjustment_type || 'CREDIT') },
          { label: 'Amount', value: fmtKsh(r.amount as string) },
          { label: 'Reason', value: asStr(r.reason), wide: true },
          { label: 'Created At', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: asStr(r.created_by || r.requested_by || 'System'),
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/finance/adjustments',
        raw: r,
      }
    }),
  },
  {
    key: 'store_orders',
    label: 'Store Orders',
    shortLabel: 'Store Orders',
    LucideIcon: Package,
    accent: 'cyan',
    borderClass: 'border-cyan-500/30',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    listUrl: '/store/orders/?status=PENDING&limit=50',
    moduleRoute: '/modules/store/orders',
    moduleLabel: 'Store › Orders',
    approveEndpoint: (id) => ({ method: 'patch', url: `/store/orders/${id}/review/` }),
    rejectEndpoint: (id) => ({ method: 'patch', url: `/store/orders/${id}/review/` }),
    approvePayload: (n) => ({ action: 'APPROVE', notes: n }),
    rejectPayload: (n) => ({ action: 'REJECT', notes: n }),
    adapter: (rows) => rows.map((r) => {
      const items = (r.items as Record<string, unknown>[] | undefined) ?? []
      const itemList = items.map((i) => asStr((i as Record<string, unknown>).item_name || '')).filter(Boolean).join(', ') || '—'
      return {
        id: r.id as number,
        title: `${asStr(r.request_code || `Order #${r.id}`)} — ${asStr(r.title || 'Store Order')}`,
        subtitle: `${items.length} item(s) · ${asStr(r.send_to || 'BOTH')}`,
        chips: [
          { label: 'Items', value: `${items.length}`, color: 'blue' },
          { label: 'Dept', value: asStr(r.send_to || 'BOTH') },
          { label: 'Code', value: asStr(r.request_code || `#${r.id}`), mono: true },
        ],
        details: [
          { label: 'Title', value: asStr(r.title) },
          { label: 'Description', value: asStr(r.description || '—'), wide: true },
          { label: 'Items Requested', value: itemList, wide: true },
          { label: 'Sent To', value: asStr(r.send_to) },
          { label: 'Requested By', value: asStr((r.requested_by as Record<string, unknown>)?.username || r.requested_by) },
          { label: 'Date', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: asStr((r.requested_by as Record<string, unknown>)?.username || r.requested_by),
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/store/orders',
        raw: r,
      }
    }),
  },
  {
    key: 'leave',
    label: 'HR Leave Requests',
    shortLabel: 'Leave',
    LucideIcon: CalendarDays,
    accent: 'blue',
    borderClass: 'border-blue-500/30',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    listUrl: '/hr/leave-requests/?status=Pending&limit=50',
    moduleRoute: '/modules/hr/leave',
    moduleLabel: 'HR › Leave',
    approveEndpoint: (id) => ({ method: 'post', url: `/hr/leave-requests/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/hr/leave-requests/${id}/reject/` }),
    approvePayload: () => ({}),
    rejectPayload: (n) => ({ reason: n }),
    adapter: (rows) => rows.map((r) => {
      const emp = r.employee as Record<string, unknown> | null ?? {}
      const leaveType = r.leave_type as Record<string, unknown> | null ?? {}
      const empName = `${asStr(emp.first_name || '')} ${asStr(emp.last_name || '')}`.trim() || asStr(r.employee)
      return {
        id: r.id as number,
        title: `Leave — ${empName}`,
        subtitle: `${asStr(leaveType.name || r.leave_type)} · ${asStr(r.days_requested)} day(s)`,
        chips: [
          { label: 'Type', value: asStr(leaveType.name || r.leave_type), color: 'blue' },
          { label: 'Days', value: asStr(r.days_requested) },
          { label: 'From', value: asStr(r.start_date), mono: true },
        ],
        details: [
          { label: 'Employee', value: empName },
          { label: 'Leave Type', value: asStr(leaveType.name || r.leave_type) },
          { label: 'Start Date', value: asStr(r.start_date), mono: true },
          { label: 'End Date', value: asStr(r.end_date), mono: true },
          { label: 'Days Requested', value: asStr(r.days_requested) },
          { label: 'Reason', value: asStr(r.reason || '—'), wide: true },
          { label: 'Applied On', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: empName,
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/hr/leave',
        raw: r,
      }
    }),
  },
  {
    key: 'acquisitions',
    label: 'Library Acquisitions',
    shortLabel: 'Library',
    LucideIcon: BookOpen,
    accent: 'violet',
    borderClass: 'border-violet-500/30',
    bgClass: 'bg-violet-500/10',
    textClass: 'text-violet-400',
    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    listUrl: '/library/acquisition/requests/?status=Pending&limit=50',
    moduleRoute: '/modules/library/acquisitions',
    moduleLabel: 'Library › Acquisitions',
    approveEndpoint: (id) => ({ method: 'post', url: `/library/acquisition/requests/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/library/acquisition/requests/${id}/reject/` }),
    approvePayload: (n) => ({ notes: n }),
    rejectPayload: (n) => ({ notes: n }),
    adapter: (rows) => rows.map((r) => {
      const resource = r.resource as Record<string, unknown> | null ?? {}
      return {
        id: r.id as number,
        title: `Acquisition — ${asStr(resource.title || r.resource || `Request #${r.id}`)}`,
        subtitle: `${asStr(r.quantity_requested || 1)} copy/copies · Est. ${fmtKsh(r.estimated_cost as string)}`,
        chips: [
          { label: 'Qty', value: asStr(r.quantity_requested || 1) },
          { label: 'Est. Cost', value: fmtKsh(r.estimated_cost as string), color: 'violet' },
          { label: 'Category', value: asStr(resource.category || '—') },
        ],
        details: [
          { label: 'Resource Title', value: asStr(resource.title || r.resource) },
          { label: 'Author', value: asStr(resource.author || '—') },
          { label: 'ISBN / Code', value: asStr(resource.isbn || resource.code || '—'), mono: true },
          { label: 'Quantity', value: asStr(r.quantity_requested || 1) },
          { label: 'Estimated Cost', value: fmtKsh(r.estimated_cost as string) },
          { label: 'Notes', value: asStr(r.notes || '—'), wide: true },
          { label: 'Requested By', value: asStr(r.requested_by) },
          { label: 'Requested At', value: fmtDate(r.requested_at as string) },
        ],
        requestedBy: asStr(r.requested_by),
        requestedAt: asStr(r.requested_at),
        ageHours: ageHours(r.requested_at as string),
        moduleRoute: '/modules/library/acquisitions',
        raw: r,
      }
    }),
  },
  {
    key: 'timetable',
    label: 'Timetable Changes',
    shortLabel: 'Timetable',
    LucideIcon: LayoutGrid,
    accent: 'emerald',
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    listUrl: '/timetable/change-requests/?status=Pending&limit=50',
    moduleRoute: '/modules/timetable/grid',
    moduleLabel: 'Timetable',
    approveEndpoint: (id) => ({ method: 'post', url: `/timetable/change-requests/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/timetable/change-requests/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const reqType = asStr(r.request_type || 'Change')
      const slot = r.slot as Record<string, unknown> | null ?? {}
      const requester = r.requested_by as Record<string, unknown> | null ?? {}
      const requesterName = asStr(requester.full_name || requester.username || r.requested_by)
      return {
        id: r.id as number,
        title: `${reqType.replace(/_/g, ' ')} — ${asStr(slot.subject || slot.school_class || `Slot #${slot.id || r.slot}`)}`,
        subtitle: `Requested by ${requesterName}`,
        chips: [
          { label: 'Type', value: reqType.replace(/_/g, ' '), color: 'green' },
          { label: 'Day', value: asStr(slot.day_of_week || '—') },
          { label: 'Requester', value: requesterName },
        ],
        details: [
          { label: 'Request Type', value: reqType.replace(/_/g, ' ') },
          { label: 'Slot', value: asStr(slot.subject || slot.school_class || `#${r.slot}`) },
          { label: 'Day of Week', value: asStr(slot.day_of_week || '—') },
          { label: 'Proposed Time', value: `${asStr(r.proposed_start_time || '—')} – ${asStr(r.proposed_end_time || '—')}`, mono: true },
          { label: 'Reason', value: asStr(r.reason || '—'), wide: true },
          { label: 'Requested By', value: requesterName },
          { label: 'Requested At', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: requesterName,
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/timetable/grid',
        raw: r,
      }
    }),
  },
]

// ─── Urgency ──────────────────────────────────────────────────────────────────

function UrgencyDot({ hours }: { hours: number }) {
  if (hours >= 72) return (
    <span title={`${Math.floor(hours)}h old — Overdue`} className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  )
  if (hours >= 24) return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 flex-shrink-0" title={`${Math.floor(hours)}h old`} />
  return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 flex-shrink-0" title={`${Math.floor(hours)}h old`} />
}

function UrgencyLabel({ hours }: { hours: number }) {
  if (hours >= 72) return <span className="text-[10px] font-bold text-red-400">Overdue {Math.floor(hours / 24)}d</span>
  if (hours >= 24) return <span className="text-[10px] font-semibold text-amber-400">{Math.floor(hours / 24)}d ago</span>
  return <span className="text-[10px] text-slate-500">{Math.floor(hours)}h ago</span>
}

// ─── Chip colors ──────────────────────────────────────────────────────────────

const CHIP_COLORS: Record<string, string> = {
  default: 'bg-slate-800 text-slate-300 border-slate-700',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

// ─── Single Approval Card ─────────────────────────────────────────────────────

function ApprovalCard({
  item, category, onAction,
}: {
  item: ApprovalItem
  category: CategoryDef
  onAction: (id: number, action: 'approve' | 'clarify' | 'reject', notes: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<ActionMode>('idle')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const notesRef = useRef<HTMLTextAreaElement>(null)

  async function submit(action: 'approve' | 'clarify' | 'reject') {
    if (action !== 'approve' && !notes.trim()) {
      notesRef.current?.focus()
      setError('Please enter a note before submitting.')
      return
    }
    setMode('submitting')
    setError(null)
    try {
      await onAction(item.id, action, notes)
      setMode('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed. Please try again.')
      setMode(action === 'approve' ? 'approving' : action === 'clarify' ? 'clarifying' : 'rejecting')
    }
  }

  if (mode === 'done') return (
    <div className={`rounded-2xl border ${category.borderClass} ${category.bgClass} p-5 flex items-center gap-3 opacity-60`}>
      <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={18} />
      <div>
        <p className="text-sm font-semibold text-slate-300">Action recorded</p>
        <p className="text-xs text-slate-500">{item.title}</p>
      </div>
    </div>
  )

  const actionPending = mode === 'submitting'

  return (
    <article className={`group rounded-2xl border bg-slate-900/60 transition-all duration-200 overflow-hidden ${
      item.ageHours >= 72
        ? 'border-red-500/30 shadow-[0_0_16px_-4px_rgba(239,68,68,0.15)]'
        : item.ageHours >= 24
          ? 'border-amber-500/20 hover:border-amber-500/40'
          : `${category.borderClass} hover:border-opacity-60`
    }`}>
      {/* ── Card Header ─────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Category icon */}
        <div className={`flex-shrink-0 rounded-xl p-2.5 ${category.bgClass} mt-0.5`}>
          <category.LucideIcon size={16} className={category.textClass} />
        </div>

        {/* Title / meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white leading-tight flex-1">{item.title}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <UrgencyDot hours={item.ageHours} />
              <UrgencyLabel hours={item.ageHours} />
            </div>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 leading-snug truncate">{item.subtitle}</p>

          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {item.chips.map(chip => (
              <span
                key={chip.label}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${CHIP_COLORS[chip.color ?? 'default']} ${chip.mono ? 'font-mono' : ''}`}
              >
                <span className="text-[9px] uppercase tracking-wide opacity-60">{chip.label}</span>
                {chip.value}
              </span>
            ))}
          </div>

          {/* Requester + time */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-slate-500">
              <span className="text-slate-600">by </span>{item.requestedBy}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">{fmtDate(item.requestedAt)}</span>
          </div>
        </div>
      </div>

      {/* ── Expandable Details ───────────────────────────── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-slate-800/80 text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition"
      >
        <span>{expanded ? 'Hide details' : 'View full details'}</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {item.details.map(d => (
            <div key={d.label} className={d.wide ? 'sm:col-span-2' : ''}>
              <dt className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">{d.label}</dt>
              <dd className={`text-xs text-slate-300 leading-snug ${d.mono ? 'font-mono' : ''}`}>{d.value}</dd>
            </div>
          ))}
        </div>
      )}

      {/* ── Inline Action Mode (clarify/reject) ─────────── */}
      {(mode === 'approving' || mode === 'clarifying' || mode === 'rejecting') && (
        <div className="px-4 pb-3 pt-2 border-t border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
            {mode === 'approving' ? 'Add optional approval note:' : mode === 'clarifying' ? 'What clarification is needed?' : 'Reason for rejection:'}
          </p>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={e => { setNotes(e.target.value); setError(null) }}
            placeholder={mode === 'approving' ? 'Optional note…' : 'Required — provide details…'}
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-slate-500 focus:outline-none resize-none"
          />
          {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => void submit(mode as 'approve' | 'clarify' | 'reject')}
              disabled={actionPending}
              className={`flex-1 rounded-xl border py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                mode === 'approving' ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                : mode === 'clarifying' ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'border-rose-500/50 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
              }`}
            >
              {actionPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : mode === 'approving' ? '✓ Confirm Approve' : mode === 'clarifying' ? '↩ Send Clarification Request' : '✗ Confirm Reject'}
            </button>
            <button
              onClick={() => { setMode('idle'); setNotes(''); setError(null) }}
              disabled={actionPending}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Action Bar ───────────────────────────────────── */}
      {mode === 'idle' && (
        <div className="flex items-center gap-1.5 px-3 pb-3 pt-1 flex-wrap">
          <button
            onClick={() => setMode('approving')}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition"
          >
            <CheckCircle2 size={11} /> Approve
          </button>
          <button
            onClick={() => { setMode('clarifying'); setTimeout(() => notesRef.current?.focus(), 50) }}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition"
          >
            <MessageSquarePlus size={11} /> Seek Clarification
          </button>
          <button
            onClick={() => { setMode('rejecting'); setTimeout(() => notesRef.current?.focus(), 50) }}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 transition"
          >
            <XCircle size={11} /> Reject
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate(item.moduleRoute)}
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition"
          >
            <ExternalLink size={10} /> {category.moduleLabel}
          </button>
        </div>
      )}
    </article>
  )
}

// ─── Category Panel ───────────────────────────────────────────────────────────

function CategoryPanel({
  category, items, loading, error, onAction, onRefresh,
}: {
  category: CategoryDef
  items: ApprovalItem[]
  loading: boolean
  error: string | null
  onAction: (id: number, action: 'approve' | 'clarify' | 'reject', notes: string) => Promise<void>
  onRefresh: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.requestedBy.toLowerCase().includes(search.toLowerCase()) ||
        i.chips.some(c => c.value.toLowerCase().includes(search.toLowerCase()))
      )
    : items

  if (loading) return (
    <div className="flex flex-col gap-3 pt-2">
      {[1, 2, 3].map(n => (
        <div key={n} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800" />
            <div className="flex-1">
              <div className="h-3 bg-slate-800 rounded w-2/3 mb-2" />
              <div className="h-2.5 bg-slate-800 rounded w-1/2 mb-3" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-slate-800 rounded-md" />
                <div className="h-5 w-20 bg-slate-800 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  if (error) return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center mt-2">
      <AlertTriangle size={24} className="text-rose-400 mx-auto mb-2" />
      <p className="text-sm font-semibold text-rose-300 mb-1">Failed to load</p>
      <p className="text-xs text-rose-400/70 mb-3">{error}</p>
      <button onClick={onRefresh} className="rounded-xl border border-rose-500/30 px-4 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 transition">
        Retry
      </button>
    </div>
  )

  return (
    <div>
      {/* Search + refresh bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${category.shortLabel.toLowerCase()}…`}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-slate-500 focus:outline-none"
          />
        </div>
        <button onClick={onRefresh} className="rounded-xl border border-slate-700 p-2 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition" title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className={`rounded-2xl border ${category.borderClass} ${category.bgClass} p-8 text-center`}>
          <div className={`inline-flex rounded-2xl p-4 ${category.bgClass} mb-3`}>
            <category.LucideIcon size={28} className={`${category.textClass} opacity-60`} />
          </div>
          <p className="text-sm font-semibold text-slate-400 mb-1">
            {search ? 'No results' : 'All clear!'}
          </p>
          <p className="text-xs text-slate-600">
            {search ? `No ${category.shortLabel.toLowerCase()} match your search.` : `No pending ${category.shortLabel.toLowerCase()} to review.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => (
            <ApprovalCard key={item.id} item={item} category={category} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalsHubPage() {
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].key)
  const [data, setData] = useState<Record<string, ApprovalItem[]>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const loadCategory = useCallback(async (cat: CategoryDef) => {
    setLoading(prev => ({ ...prev, [cat.key]: true }))
    setErrors(prev => ({ ...prev, [cat.key]: null }))
    try {
      const res = await apiClient.get<unknown>(cat.listUrl)
      const raw = (res.data as Record<string, unknown>)
      const rows = Array.isArray(raw) ? raw : (Array.isArray((raw).results) ? (raw as { results: Record<string, unknown>[] }).results : []) as Record<string, unknown>[]
      const items = cat.adapter(rows)
      setData(prev => ({ ...prev, [cat.key]: items }))
      setCounts(prev => ({ ...prev, [cat.key]: items.length }))
    } catch {
      setErrors(prev => ({ ...prev, [cat.key]: 'Could not load data — check module access.' }))
      setData(prev => ({ ...prev, [cat.key]: [] }))
      setCounts(prev => ({ ...prev, [cat.key]: 0 }))
    } finally {
      setLoading(prev => ({ ...prev, [cat.key]: false }))
    }
  }, [])

  // Load all categories on mount
  useEffect(() => {
    CATEGORIES.forEach(cat => void loadCategory(cat))
  }, [loadCategory])

  const totalPending = Object.values(counts).reduce((a, b) => a + b, 0) - resolved.size

  const handleAction = useCallback(async (
    catKey: string,
    itemId: number,
    action: 'approve' | 'clarify' | 'reject',
    notes: string,
  ) => {
    const cat = CATEGORIES.find(c => c.key === catKey)
    if (!cat) return
    const ep = action === 'approve' ? cat.approveEndpoint(itemId) : cat.rejectEndpoint(itemId)
    const payload = action === 'approve'
      ? cat.approvePayload(notes)
      : action === 'reject'
        ? cat.rejectPayload(notes)
        : { clarification_notes: notes, status: 'PENDING_CLARIFICATION' }

    if (ep.method === 'post') {
      await apiClient.post(ep.url, payload)
    } else {
      await apiClient.patch(ep.url, payload)
    }

    // Mark resolved (remove from list)
    const resolvedKey = `${catKey}:${itemId}`
    setResolved(prev => new Set([...prev, resolvedKey]))
    setData(prev => ({
      ...prev,
      [catKey]: (prev[catKey] ?? []).filter(i => i.id !== itemId),
    }))
    setCounts(prev => ({ ...prev, [catKey]: Math.max(0, (prev[catKey] ?? 1) - 1) }))
  }, [])

  const activeCategory = CATEGORIES.find(c => c.key === activeKey) ?? CATEGORIES[0]
  const activeItems = data[activeKey] ?? []
  const activeLoading = loading[activeKey] ?? false
  const activeError = errors[activeKey] ?? null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="p-1 text-slate-500 hover:text-slate-300 transition">
                <ArrowRight size={14} className="rotate-180" />
              </button>
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-amber-500/15 p-1.5">
                  <Zap size={16} className="text-amber-400" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white leading-none">Approvals Command Center</h1>
                  <p className="text-[10px] text-slate-500 mt-0.5">Review, approve, clarify or reject across all modules</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalPending > 0 && (
                <span className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                  {totalPending} pending
                </span>
              )}
              <button
                onClick={() => CATEGORIES.forEach(cat => void loadCategory(cat))}
                className="rounded-xl border border-slate-700 p-2 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition"
                title="Refresh all"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Category Nav ─────────────────────── */}
          {/* Desktop vertical rail */}
          <aside className="hidden lg:flex flex-col gap-1 w-56 flex-shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 px-2 mb-1">Categories</p>
            {CATEGORIES.map(cat => {
              const count = counts[cat.key] ?? 0
              const isLoading = loading[cat.key] ?? false
              const isActive = cat.key === activeKey
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveKey(cat.key)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition text-left ${
                    isActive
                      ? `${cat.bgClass} ${cat.textClass} border ${cat.borderClass}`
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <cat.LucideIcon size={14} className="flex-shrink-0" />
                  <span className="flex-1 leading-tight">{cat.shortLabel}</span>
                  {isLoading ? (
                    <Loader2 size={10} className="animate-spin text-slate-500" />
                  ) : count > 0 ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold border ${isActive ? cat.badgeClass : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-700">—</span>
                  )}
                </button>
              )
            })}

            {/* Summary totals */}
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Summary</p>
              <div className="flex flex-col gap-1.5">
                {CATEGORIES.map(cat => {
                  const c = counts[cat.key] ?? 0
                  return (
                    <div key={cat.key} className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{cat.shortLabel}</span>
                      <span className={`text-[10px] font-bold ${c > 0 ? cat.textClass : 'text-slate-700'}`}>{c}</span>
                    </div>
                  )
                })}
                <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">Total</span>
                  <span className="text-[10px] font-bold text-amber-400">{totalPending}</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Urgency</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" /><span className="text-[10px] text-slate-500">Fresh (&lt;24h)</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" /><span className="text-[10px] text-slate-500">Aging (1–3 days)</span></div>
                <div className="flex items-center gap-2"><span className="relative flex h-2 w-2 flex-shrink-0"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-red-500" /></span><span className="text-[10px] text-slate-500">Overdue (&gt;3 days)</span></div>
              </div>
            </div>
          </aside>

          {/* Mobile / tablet horizontal pill tabs */}
          <div className="lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 pb-2 min-w-max">
              {CATEGORIES.map(cat => {
                const count = counts[cat.key] ?? 0
                const isActive = cat.key === activeKey
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveKey(cat.key)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      isActive ? `${cat.bgClass} ${cat.textClass} ${cat.borderClass}` : 'border-slate-700 text-slate-400 bg-slate-900'
                    }`}
                  >
                    <cat.LucideIcon size={11} />
                    {cat.shortLabel}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold border ml-0.5 ${isActive ? cat.badgeClass : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right: Active Category Content ──────────── */}
          <main className="flex-1 min-w-0">
            {/* Active category header */}
            <div className={`rounded-2xl border ${activeCategory.borderClass} ${activeCategory.bgClass} px-4 py-3 mb-4 flex items-center gap-3`}>
              <activeCategory.LucideIcon size={18} className={activeCategory.textClass} />
              <div className="flex-1">
                <h2 className={`text-sm font-bold ${activeCategory.textClass}`}>{activeCategory.label}</h2>
                <p className="text-[11px] text-slate-500">
                  {activeLoading ? 'Loading…' : `${activeItems.length} item${activeItems.length !== 1 ? 's' : ''} pending review`}
                </p>
              </div>
              <button
                onClick={() => navigate(activeCategory.moduleRoute)}
                className={`flex items-center gap-1.5 rounded-xl border ${activeCategory.borderClass} px-3 py-1.5 text-[11px] font-semibold ${activeCategory.textClass} hover:${activeCategory.bgClass} transition`}
              >
                <ExternalLink size={11} /> Open Module
              </button>
            </div>

            {/* Cards */}
            <CategoryPanel
              category={activeCategory}
              items={activeItems}
              loading={activeLoading}
              error={activeError}
              onAction={(id, action, notes) => handleAction(activeKey, id, action, notes)}
              onRefresh={() => void loadCategory(activeCategory)}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
